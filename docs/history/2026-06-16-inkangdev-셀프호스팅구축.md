# 셀프 호스팅 구축 (내 PC = Render + Supabase) — 2026-06-16 (inkangdev)

브랜치: `feature/self-hosting` → main 머지

Supabase·Render 무료 등급 한계(세션풀러 15연결, 메모리, 콜드스타트)에서 벗어나려고
**24시간 켜둔 Windows PC** 한 대를 Render+Supabase 처럼 만든다. 개발자 3명 전용이라 VM·유료 도메인 없이 간다.

## 구성 (확정)

- **Docker Compose 4서비스**: `db`(Postgres) · `backend`(Spring Boot) · `ai`(FastAPI/Gemini) · `web`(nginx).
- **공개 주소**: **Tailscale Funnel** — 무료·고정 `https://<머신>.<테일넷>.ts.net` HTTPS. web(8088)을 묶음.
- **자동배포**: GitHub **self-hosted runner**(내 PC) — `main` push → `docker compose up -d --build`.
- **코드 무수정**: 백엔드/AI 의 env 변수명(`SUPABASE_DB_URL` 등) 그대로 두고 값만 로컬 DB(`jdbc:postgresql://db:5432/jumisa`)로. → 클라우드 복귀는 `.env` 값 교체만으로 가능(`render.yaml` 보존).

## 추가/변경 파일

```
docker-compose.yml            db+backend+ai+web. db에 schema.sql·02-batch.sql 마운트, pgdata 볼륨, 5432/8088 게시.
.dockerignore                 루트 컨텍스트(web/ai) 빌드 제외(.env/.git/node_modules/build/docs…).
deploy/nginx.conf             정적 dist + /api·/oauth2·/login/oauth2→backend, /ai→ai, /*→index.html. X-Forwarded-Proto 전달.
deploy/web.Dockerfile         node:24 빌드(npm ci && npm run build) → nginx:alpine 서빙. (호스트 node 불필요)
deploy/ai.Dockerfile          python:3.12-slim, pip install, `python -m ai.app`(PORT 환경변수).
deploy/db-init/02-batch.sql   Spring Batch 5.2.2 PostgreSQL 메타테이블 DDL(빈 볼륨 최초 1회).
deploy/.env.example           compose 가 읽는 변수 견본(POSTGRES_*, FRONTEND_URL, KAKAO_*, GEMINI_*).
.github/workflows/deploy.yml  self-hosted runner: checkout → 호스트 .env 주입 → compose up -d --build → image prune.
docs/ops/셀프호스팅.md         설치·운영 런북(Docker/Tailscale/Funnel/카카오/러너/배치적재/치트시트).
```

- `backend/db/schema.sql` 은 **복사 안 하고** compose 에서 직접 마운트(`01-schema.sql`) → 스키마 drift 방지.
- 기존 `backend/Dockerfile`·`render.yaml` 보존(클라우드 백업 경로).

## 핵심 설계 결정

- **nginx 가 render.yaml routes 1:1 재현** — 프론트는 상대경로(`/api`,`/ai`)라 동일 출처 서빙으로 무수정 동작.
- **`X-Forwarded-Proto: https` 전달** — 백엔드 `forward-headers-strategy=framework` 가 외부 https 인식 → 카카오 redirect_uri(baseUrl) 정상.
- **비밀 .env 주입**: 체크아웃엔 .env 없음 → 러너 PC 고정 경로(`C:\jumisa-secrets\.env`, 또는 `JUMISA_ENV_FILE`)에서 워크플로가 복사. GitHub Secrets 불필요.
- **DB 영속**: named volume `pgdata`. `down -v` 금지. stock/재무는 배치 재실행으로 로컬 적재.
- **배치 메타테이블**: `initialize-schema=never` 라 부팅 시 안 만듦 → `02-batch.sql` 로 선생성.

## 사용자 1회 셋업 (런북 docs/ops/셀프호스팅.md)

1. Docker Desktop + Tailscale 설치.
2. 루트 `.env` 채움(`deploy/.env.example`) → `docker compose up -d --build` → http://localhost:8088 확인.
3. `tailscale funnel 8088` → 공개주소 확보 → `FRONTEND_URL` 교체·재기동.
4. 카카오 콘솔 Redirect URI 등록(`…ts.net/login/oauth2/code/kakao`).
5. GitHub self-hosted runner 설치(+ `C:\jumisa-secrets\.env`) → 이후 push 자동배포.
6. `:batch` bootRun(로컬 DB) 으로 stock/재무 적재.

## 검증

- `frontend npm run build`(= web 이미지 빌드 단계) 그린 — 로컬 확인.
- `docker compose config` 유효성, 4서비스 기동/`docker compose ps` healthy — **사용자 PC 에서 Docker 설치 후 수행 예정**.
- 공개 URL 외부망 접속 + 카카오 로그인, push 자동배포 — 셋업 후 확인.

## 메모

- Tailscale Funnel 은 443/8443/10000 만 공개 → `funnel 8088` 이 내부 443 으로 노출.
- 스키마 변경 시 기존 볼륨엔 init 스크립트 미적용 → 수동 `psql` 마이그레이션 필요.
