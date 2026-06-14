# 작업 히스토리 — 2026-06-14 · Render 배포 연동

Jumisa(백엔드 + 프론트)를 **Render** 에 배포하기 위한 설정 파일 작성 및 연동 절차 정리.

## 왜 Render인가 / 무엇을 올리나

- Render = 만든 프로그램을 인터넷 서버에 24시간 띄워주는 호스팅 서비스(무료 플랜 존재).
- 현재 구성
  - **백엔드**: Spring Boot 3.5 + Kotlin, JDK 21, Gradle
  - **프론트**: React 19 + Vite (SPA)
  - **DB**: Supabase Postgres (이미 외부에 있음 → Render에 안 올림, 연결만)
- 따라서 Render에는 **백엔드(Web Service) + 프론트(Static Site)** 2개만 올린다.

---

## 1. 작성/수정한 파일

### `backend/Dockerfile` (신규)
- 멀티스테이지: `eclipse-temurin:21-jdk` 로 `bootJar` 빌드 → `eclipse-temurin:21-jre` 로 실행.
- 의존성 캐시를 위해 gradle 래퍼/빌드스크립트 먼저 복사.
- 이미지 빌드 시 테스트 제외(`-x test`): 테스트가 Supabase 연결을 요구하기 때문.

### `render.yaml` (신규, 저장소 루트)
- **jumisa-backend** — `type: web`, `runtime: docker`, `plan: free`, `region: singapore`
  - `healthCheckPath: /actuator/health`
  - 환경변수(대시보드에서 직접 입력, `sync: false`):
    `SUPABASE_DB_URL`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`
  - 배치/KIS 키는 주석 템플릿만 둠.
- **jumisa-frontend** — `type: web`, `runtime: static`
  - `rootDir: frontend`, `buildCommand: npm ci && npm run build`, `staticPublishPath: ./dist`
  - rewrite 규칙
    - `/api/* → 백엔드` : 브라우저 입장 same-origin 유지 → **세션 쿠키 인증이 정상 동작**
      (dev 의 vite proxy 를 프로덕션에서 재현하는 것)
    - `/* → /index.html` : SPA 라우팅

### `backend/src/main/resources/application.yml` (수정)
- `server.port` → `${PORT:${SERVER_PORT:8080}}`
- Render가 주입하는 `PORT` 우선, 로컬은 기존 `SERVER_PORT`, 둘 다 없으면 8080.

---

## 2. Render 연동 절차 (대시보드에서 수동)

0. **준비** — Supabase 접속 정보 3개 확보 (`backend/.env` 또는 Supabase → Settings → Database).
1. **가입** — https://render.com → GitHub 계정으로 Sign up → 권한 허용.
2. **Blueprint 생성** — 대시보드 `New +` → **Blueprint** → 저장소 `inkangdev/jumisa` 선택.
3. **⚠️ 브랜치 선택** — `render.yaml` 이 `main` 이 아니라
   `claude/render-deployment-setup-ay59dr` 에 있으므로, Blueprint 화면의 **Branch** 를 해당 브랜치로 지정해야 서비스/입력칸이 나타난다.
   (또는 `render.yaml` 을 `main` 에 머지하면 브랜치 신경 안 써도 됨.)
4. **비밀값 입력** — `SUPABASE_DB_URL / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD` 입력 → Apply.
5. **빌드/배포 대기** — 5~10분. 백엔드가 "Live" 되면 백엔드 URL 확정
   (예: `https://jumisa-backend-xxxx.onrender.com`).
6. **백엔드 URL 반영** — 확정된 URL 로 `render.yaml` 의 프론트 rewrite `destination`
   (`https://jumisa-backend.onrender.com`) 을 수정 후 커밋 → 프론트 재배포.

---

## 3. 검토/주의 포인트

- **세션 쿠키**: 프론트의 `/api/*` rewrite 프록시로 same-origin 유지되어야 로그인 세션이 동작. 백엔드를 다른 도메인으로 직접 호출하면 쿠키가 안 붙는다.
- **Supabase 연결**: 직접연결(5432) 또는 pooler(6543, transaction 모드).
  pooler 사용 시 `application.yml` 의 `prepareThreshold: 0` 주석 해제 필요.
- **Free 플랜**: 미사용 시 spin-down → 첫 요청이 느림(콜드 스타트).
- **배치 스케줄러**: 기본 비활성(`BATCH_SCHEDULER_ENABLED=false`). 운영에서 켤지는 별도 결정.

---

## 4. 진행 상태 (2026-06-14 기준)

- [x] Dockerfile / render.yaml / application.yml 작성·커밋·푸시 (`claude/render-deployment-setup-ay59dr`)
- [ ] Render 가입 및 Blueprint 연결 (GitHub 연동까지 진행됨)
- [ ] 비밀값 입력 / 첫 배포
- [ ] 백엔드 확정 URL 을 프론트 rewrite 에 반영
