# Render/Supabase 잔재 정리 — 셀프호스팅 전용화 — 2026-06-16 (inkangdev)

브랜치: `feature/batch-docker` (배치 도커화 PR #9 에 이어서 커밋)

셀프호스팅으로 완전 전환했으므로 **클라우드(Render/Supabase) 복귀 경로를 폐기**하고 잔재를 제거한다.
(이전 셀프호스팅구축 때는 `render.yaml`·`SUPABASE_*` 변수명을 복귀 경로로 보존했으나, 이번에 완전 정리.)

## DB 변수 리네임 (클라우드 흔적 제거)

`SUPABASE_DB_URL/USER/PASSWORD` → `DB_URL/DB_USER/DB_PASSWORD`. `BATCH_DB_URL` 은 제거(로컬 단일 DB라
트랜잭션 풀러 개념 불필요 → `DB_URL` 로 통합).

- `backend/src/main/resources/application.yml` — datasource + 주석(Supabase/Render 표현 제거)
- `batch/src/main/resources/application.yml` — `${BATCH_DB_URL:${SUPABASE_DB_URL}}` → `${DB_URL}`, 풀러 주석 정리
- `ai/config/settings.py` — env 키·검증 리스트·docstring
- `docker-compose.yml` — backend/ai/batch 3개 서비스 environment (batch 의 BATCH_DB_URL 줄 삭제)

## 삭제

```
render.yaml              클라우드 배포 blueprint (복귀 경로 폐기)
docs/ops/배포.md          Render 배포/운영 레퍼런스 (현행은 docs/ops/셀프호스팅.md)
deploy/.env.example      루트 .env.example 과 중복 → 통합
.mcp.json                Supabase 관리 MCP (로컬 DB 전환으로 불필요, git 미추적)
```

## 주석/문서 정리

- `deploy/nginx.conf` — "render.yaml routes 재현" → 일반 설명
- `frontend/src/App.tsx`·`api/auth.ts` — "Render 무료플랜 콜드스타트" 주석 일반화
- `.env.example` — 셀프호스팅(로컬 Postgres) 기준으로 전면 재작성
- `ai/.env.example`·`ai/README.md` — SUPABASE_* → DB_*, render.yaml 배포 언급 → docker compose
- `docs/ops/셀프호스팅.md` — DB_* 반영, deploy/.env.example 참조 정리, 클라우드 복귀 주의문 삭제
- `CLAUDE.md` — 참고문서를 `docs/ops/배포.md`(Render) → `docs/ops/셀프호스팅.md` 로 교체
- 실제 루트 `.env`(git 미추적) — SUPABASE_*/BATCH_DB_URL 제거, DB_* 추가

## 검증

- `grep -E 'SUPABASE_DB|BATCH_DB_URL|render\.yaml|onrender'`(history 제외) → 매치 0.
- `docker compose config` OK, `docker compose up -d --build` 그린.
- 5서비스(ai/backend/batch/db/web) 모두 Up, backend `Started`·batch `HikariPool Start completed`(DB_* 로 DB 연결), localhost:8088 → 200.

## 메모

- 앱 코드엔 원래 클라우드 URL 하드코딩이 없었음(전부 env 주입) → 코드 로직 변경 없이 변수명/문서만 정리.
- 클라우드로 다시 가려면 이제 `.env` 의 `DB_URL` 등을 클라우드 주소로 바꾸고 별도 배포 수단을 새로 구성해야 함(render.yaml 미보존).
