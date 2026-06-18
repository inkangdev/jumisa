# 로컬 개발용 DB(도커) 분리 + Flyway 도입

작업자: inkangdev / 2026-06-17

## 배경 / 목적

- 작업자 PC에서 **로컬 개발 시 로컬 Postgres(localhost:5432)** 를 바라보게 하고 싶다.
- 기존 스키마 적용은 `docker-entrypoint-initdb.d`(`backend/db/schema.sql` + `deploy/db-init/02-batch.sql`)로
  **빈 볼륨 최초 1회만** → 스키마 변경이 기존 DB에 전파 안 되는 약점(셀프호스팅.md). → **Flyway 로 일원화**.

## 결정

- **compose 2개로 분리**
  - 운영: `docker-compose.yml` (db·backend·ai·web·batch) — **변경 없음**.
  - 로컬: `docker-compose.local.yml` (신규) — **DB만**. 앱은 IntelliJ에서 host 실행.
- **Flyway 단일 소유자 = backend** (backend·batch가 같은 DB 공유 → 양쪽 migrate 충돌 방지).
  batch 는 기존대로 `initialize-schema: never`, backend가 만든 스키마(배치 메타 포함)에 의존.
- **단일 `V1__init.sql`** = 현행 앱 스키마 + Spring Batch 메타 통합(베이스라인).

## 변경 파일

- `docker-compose.local.yml` (신규): postgres:16-alpine 만. `name: jumisa-local`, 볼륨 `pgdata_local`,
  5432 노출, initdb 마운트 없음(스키마는 Flyway가 생성). 운영 `pgdata` 와 분리.
- `backend/build.gradle.kts`: `org.flywaydb:flyway-core` + `org.flywaydb:flyway-database-postgresql` 추가
  (Spring Boot 3.5 관리버전 → Flyway 11.7.2. PG는 전용 모듈 필요).
- `backend/src/main/resources/application.yml`: `spring.flyway` 추가 —
  `enabled: true`, `baseline-on-migrate: true`, `baseline-version: 1`.
- `backend/src/main/resources/db/migration/V1__init.sql` (신규): `schema.sql` + `02-batch.sql` 통합
  (배치 CREATE에 `IF NOT EXISTS` 부여).

## baseline 동작 (안전성)

| 대상 | 동작 |
|---|---|
| 신규 로컬 DB(빈 볼륨) | V1 전체 실행 → 스키마 생성 |
| 기존 운영 DB(데이터 존재) | baseline-on-migrate → V1 "적용됨"으로 마킹·스킵(안전), 이후 V2+만 적용 |
| 신규 운영 볼륨 | initdb가 먼저 스키마 생성 → backend Flyway는 non-empty 감지 → baseline·스킵(일관) |

## 로컬 개발 절차

```bash
# 1) 로컬 DB 기동 (도커는 DB만)
docker compose -f docker-compose.local.yml up -d

# 2) backend 기동 (Flyway가 V1 실행 → 앱 스키마 + 배치 메타 생성)
cd backend && ./gradlew bootRun

# 3) batch 기동 (스키마 이미 존재)
cd batch && ./gradlew bootRun --args='master'   # 또는 price
```

- `.env` 는 `.env.example` 그대로 — host 실행용 `DB_URL=jdbc:postgresql://localhost:5432/jumisa` 사용.
- 새 로컬 DB에서 batch 단독 실행 전, backend를 1회 띄워 배치 메타테이블을 만들어야 함(V1에 포함).
- `down -v` 금지(로컬도 볼륨 삭제됨).

## 검증

- `./gradlew dependencies` → flyway-core / flyway-database-postgresql 11.7.2 해석 확인.
- `compileKotlin` 통과.

## 후속 — 운영 compose Flyway 일원화 (완료)

운영 `docker-compose.yml` 도 initdb 제거하고 Flyway 단일 소스로 통일:

- `db` 서비스: `01-schema.sql`·`02-batch.sql` initdb 마운트 제거(스키마는 backend Flyway 가 생성).
- `backend` 서비스: **healthcheck** 추가 — `bash -c 'exec 3<>/dev/tcp/localhost/8080'`.
  Spring 은 Flyway 마이그레이션 완료 후에야 8080 을 바인딩하므로 **포트 오픈 = 스키마 준비 완료** 의 정확한 신호.
  (temurin JRE 에 curl/wget 없음 → bash `/dev/tcp` 사용.)
- `batch`·`ai` 서비스: `depends_on` 에 `backend: service_healthy` 추가 →
  빈 볼륨 최초 기동 시 스키마 생성 전에 붙는 순서 문제 방지(batch 는 `initialize-schema=never`).
- **삭제**: `backend/db/schema.sql`, `deploy/db-init/02-batch.sql`(빈 `deploy/db-init/`·`backend/db/` 디렉터리 제거).
  스키마 단일 소스 = `backend/.../db/migration/V1__init.sql`. drift 방지.
- 문서 갱신: `docs/ops/셀프호스팅.md`(구성 파일 목록·스키마 적용·치트시트 주의).

검증: `docker-compose.yml`·`docker-compose.local.yml` YAML 파싱 OK(이 PC 엔 docker 미설치라 `compose config` 는 작업자 PC 에서 확인).

## 실기동 검증 (맥북, 2026-06-18)

- `docker compose -f docker-compose.local.yml up -d` → `jumisa-db-local` healthy(5432).
- 로컬 개발용 `.env` 생성(루트, git 미커밋): DB 비번 `jumisa-local-dev`, `DB_URL=localhost:5432`.
  카카오 키 비우면 Spring OAuth2 가 부팅 거부(`Client id ... must not be empty`) → 로컬용 더미 `local-dummy` 채움(실제 로그인 시 발급 키로 교체).
- `cd backend && ./gradlew bootRun` → Flyway `Successfully applied 1 migration` → `Started AppApplicationKt`.
- DB 확인: 19개 테이블 생성(앱 + social_account + watchlist + batch_* + flyway_schema_history).

## V1 현행화 — social_account / watchlist 추가

최초 V1 은 (구)`backend/db/schema.sql` 기준이라 최근 main 추가분이 빠져 있었음. origin/main 대조 후 보강:

- **watchlist** — origin/main `schema.sql` 에 추가된 관심종목 테이블(`feat: 관심종목 설정`). V1 에 반영.
- **social_account** — 소셜 로그인 매핑 테이블. 코드(`MemberRepository.findOrCreateBySocialAccount`)는 쓰는데
  `schema.sql` 엔 없던 drift(Supabase 직접 적용 추정). 정식 DDL 을 V1 에 포함해 단일 소스로 정리.
- 두 테이블 추가 후 로컬 볼륨 재생성(`down -v`, 빈 개발 DB 라 안전)하여 수정된 V1 재적용·검증 완료.

> 참고: 작업 시점 로컬 `main` 이 origin/main 보다 9 커밋 뒤처져 있었음(`관심종목`·대결 UI 등).
> 본 Flyway 작업은 미커밋 상태 → origin/main 동기화 시 `schema.sql` 삭제분과 머지 충돌 주의.
