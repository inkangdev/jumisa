# 작업 히스토리 — 2026-05-30

Jumisa 프로젝트 초기 셋업. 기획 정리 → 기술스택 확정 → 백엔드 골격 + Supabase 연동 → KIS 실데이터 확인 → DB 테이블 설계/생성까지.

## 1. 기획 / 문서

- **기능 정의서 v1.0** 작성 (`docs/기능정의서_v1.0.md`)
  - 저평가 스크리너 / 로그인·회원 / 공통 / 모의투자 4개 영역
  - 미결 사항 6개 체크리스트 (미국 주식 포함 여부, 저평가 점수 가중치, 소셜 로그인 방식, 초기 포인트, 재충전 정책, 환율 적용 시점)
- **CLAUDE.md** 작성 — 작업 규칙 1: "시키지 않은 것은 하지 마라"

## 2. 기술 스택 확정

| 영역 | 선택 | 비고 |
|------|------|------|
| 앱/웹 | **Flutter** | 앱 우선. 단일 코드로 iOS/Android/웹. 팀 논의 후 RN과 최종 확정 예정 |
| 백엔드 | **Kotlin + Spring Boot 3.5 + Spring Batch** | 자바 20년 경력 자산 활용 |
| DB | **Supabase (Postgres)** | 공유 DB 하나로 운영 (개별 로컬 DB 안 씀) |
| 레포 | **모노레포** | `backend/`, `app/`(예정), `docs/` |

- 팀: 백엔드 2 / 프론트 1, **코딩은 전부 Claude Code**가 담당, 사람은 기획·리뷰
- 그래서 "AI가 잘 짜는 메인스트림 스택 + 팀이 리뷰 가능"을 기준으로 선택

## 3. 백엔드 골격 구성 (`backend/`)

- Spring Initializr로 생성: Kotlin, Gradle(Kotlin DSL), Boot 3.5.0
- 의존성: Web, Spring Batch, Data JPA, PostgreSQL, Validation, Actuator
- `spring-dotenv` 추가 → `.env` 파일로 자격증명 관리 (git 제외)
- `settings.gradle.kts`에 foojay 리졸버 추가 (JDK 21 자동 다운로드; 시스템엔 24만 설치돼 있음)
- 빌드/컴파일 검증 완료

## 4. Supabase 연동

- 연결 방식: JDBC + `.env` 환경변수 (비밀번호는 git에 안 올라감)
- **Session pooler** 사용: `aws-1-ap-northeast-2.pooler.supabase.com:5432` (IPv4 호환)
- `application.yml`: `ddl-auto: none`(스키마는 Supabase에서 관리), 배치 메타테이블 자동생성, 부팅 시 배치 job 자동실행 off
- `bootRun`으로 **실제 연결 검증 완료** (Postgres 17.6, `/actuator/health` UP)
- Flyway 잠깐 도입했다가 **제거** — 공유 Supabase 하나로 가기로 해서 불필요
  - (잔여물: Supabase에 `flyway_schema_history` 테이블이 남아있음 — 무해, 원하면 DROP)

## 5. KIS(한국투자증권) Open API 연동

- 앱키/시크릿/계좌 발급 → `.env`에 저장 (`KIS_ENV=vts` 모의 도메인)
- `KisClient` 구현: OAuth 토큰 발급(캐시) + 국내주식 현재가 시세(TR `FHKST01010100`)
- 임시 엔드포인트 `GET /dev/kis/current-price/{code}`로 **삼성전자(005930) 실데이터 조회 성공** (`rt_cd: 0`)
- 응답에서 핵심 필드 확인:
  - 시세: `stck_prpr`(현재가), 시/고/저, `acml_vol`, `hts_avls`(시총)
  - 가치지표: `per`, `pbr`, `eps`, `bps` ⭐ (저평가 점수 핵심)
  - 기초: `bstp_kor_isnm`(업종), `lstn_stcn`(상장주식수)
  - ⚠️ **종목명(한글)은 응답에 없음** → 추후 공공데이터로 보강 필요

## 6. DB 테이블 설계 / 생성

KIS 응답 구조 기반, 변경 주기별로 3개 분리 (`backend/db/schema.sql`):

- **`stock`** (9컬럼) — 종목 마스터 (불변): 종목코드, 종목명, 시장, 업종, 상장주식수 등
- **`stock_price_snapshot`** (16컬럼) — 1시간 단위 시세 (시계열): 현재가, 시고저, 거래량, 시총
- **`stock_valuation`** (11컬럼) — 일별 가치지표: PER, PBR, EPS, BPS, 52주 고저

- Supabase에 적용 + dev 엔드포인트(`GET /dev/db/tables`)로 생성 검증 완료
- 테이블은 아직 비어있음 (적재 미구현)

## 7. Git

- 브랜치 `initial-project` (main ← docs/feature-spec ← initial-project)
- 백엔드 골격 + Supabase 연동까지 커밋 & 푸시 완료
- `gh`↔`git` 자격증명 연결 (이후 푸시 인증 불필요)
- ※ KIS 클라이언트 / 테이블 설계 이후 작업은 **아직 미커밋**

## 임시(제거 예정) 코드

- `kis/DevKisController.kt` — KIS 시세 까보기용
- `kis/DevDbController.kt` — 테이블 확인용
- → 본 기능 구현 시 삭제

## 다음 후보

- JPA 엔티티 매핑 (3테이블 ↔ Kotlin)
- **1시간 주가 적재 배치** (핵심 기능)
- 공공데이터 API로 종목명/재무 보강
- 저평가 점수 산출 (※ PER/PBR 가중치 = 미결 사항)
