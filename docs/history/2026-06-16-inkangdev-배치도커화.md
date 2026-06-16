# 배치(Spring Batch) 도커화 — 셀프호스팅 스택에 batch 서비스 추가 — 2026-06-16 (inkangdev)

브랜치: `feature/batch-docker` → main 머지(PR)

셀프호스팅 스택(db/backend/ai/web)에 **batch 를 5번째 컨테이너로 추가**한다.
기존엔 stock/재무 적재를 IntelliJ `:batch` bootRun 으로 수동 실행했는데, 24시간 PC 의 batch 컨테이너가
**상주 스케줄러**로 자동 적재하도록 바꾼다.

## 추가/변경 파일

```
batch/Dockerfile        backend/Dockerfile 과 동일한 2-스테이지(JDK21 bootJar → JRE21). 비웹이라 EXPOSE 없음.
batch/.gitattributes    /gradlew text eol=lf (backend 와 동일). CRLF 체크아웃 → 컨테이너 빌드 실패 재발 방지.
docker-compose.yml      batch 서비스 추가(상주 스케줄러). volumes 에 kis_token(토큰 캐시 영속) 추가. 헤더 주석 갱신.
docs/ops/셀프호스팅.md   다이어그램·구성파일·6번 적재 섹션·치트시트를 batch 반영해 갱신.
batch/gradlew           CRLF → LF 정규화(working tree).
```

## 핵심 설계 결정

- **상주 스케줄러 모드**: `BATCH_SCHEDULER_ENABLED=true`(기본). `BatchScheduler` 가 `@Scheduled` cron 으로
  평일 08시 마스터 / 09~15시 매시 시세 / 매일 04:30 정리 / 일요일 06시 재무 를 자동 실행. (CLI 일회성은 보조 수단)
- **DB 무수정 재사용**: backend/ai 와 동일하게 `BATCH_DB_URL`·`SUPABASE_DB_URL` 을 로컬 db(`db:5432`)로,
  user/pw 는 `POSTGRES_*` 로 오버라이드. 배치 메타테이블은 compose db-init 의 `02-batch.sql` 로 이미 생성됨(`initialize-schema: never`).
- **KIS 토큰 영속**: 기본 캐시 경로가 컨테이너 `/tmp`(재시작 시 소실 → 토큰 재발급 제한 위험)라,
  `KIS_TOKEN_CACHE_PATH=/app/kis-data/token.json` + named volume `kis_token` 으로 영속.
- **gradlew CRLF 버그**: batch 엔 `.gitattributes` 가 없어 `gradlew` 가 CRLF 로 체크아웃됨 → Linux 컨테이너에서
  shebang(`#!/bin/sh\r`) 해석 실패로 `not found`(exit 127). backend 처럼 `.gitattributes` 추가 + LF 정규화로 해결.

## 검증

- `docker compose up -d --build batch` 그린. 5서비스(ai/backend/batch/db/web) 모두 Up, db healthy.
- batch: `Started BatchApplicationKt`, HikariPool DB 연결 성공, 비웹인데 상주(=스케줄러 활성).
- 컨테이너 env 확인: `BATCH_SCHEDULER_ENABLED=true`, `BATCH_DB_URL=jdbc:postgresql://db:5432/jumisa`,
  `KIS_TOKEN_CACHE_PATH=/app/kis-data/token.json`, KIS 키 주입됨. `kis_token` 볼륨 `/app/kis-data` 마운트 확인.
- 실제 적재(KIS 호출)는 스케줄 시각(평일 09시 등) 또는 `docker compose run --rm -e BATCH_SCHEDULER_ENABLED=false batch master` 로 검증 예정.

## 메모

- 자동배포(self-hosted runner)로 main 머지 시 batch 까지 자동 재배포됨.
- 스키마 변경 시 기존 pgdata 볼륨엔 init 미적용 — 수동 마이그레이션 필요(기존 주의와 동일).
