# 작업 히스토리 — 2026-06-14

Jumisa 프로젝트를 Render에 배포하기 위한 인프라 설정 파일 작성.

## 배경

- 현재 구성: 백엔드(Spring Boot 3.5 + Kotlin, JDK 21, Gradle), 프론트(React 19 + Vite SPA), DB(Supabase Postgres, 외부).
- DB가 Supabase 외부에 있으므로 Render에는 **백엔드(Web Service) + 프론트(Static Site)** 두 개만 올리면 됨.

## 작성/수정한 파일

### 1. `backend/Dockerfile` (신규)
- 멀티스테이지: `eclipse-temurin:21-jdk` 로 `bootJar` 빌드 → `eclipse-temurin:21-jre` 로 실행.
- 의존성 캐시를 위해 gradle 래퍼/빌드스크립트 먼저 복사.
- 이미지 빌드 시 테스트 제외(`-x test`): 테스트가 Supabase 연결을 요구하기 때문.

### 2. `render.yaml` (신규, 저장소 루트)
- **jumisa-backend** (web, runtime: docker, free, singapore 리전)
  - `healthCheckPath: /actuator/health`
  - 환경변수: `SUPABASE_DB_URL / SUPABASE_DB_USER / SUPABASE_DB_PASSWORD` (sync: false, 대시보드 직접 입력)
  - 배치/KIS 키는 주석으로 템플릿만 둠.
- **jumisa-frontend** (web, runtime: static)
  - `rootDir: frontend`, `buildCommand: npm ci && npm run build`, `staticPublishPath: ./dist`
  - rewrite 규칙: `/api/* → 백엔드`(세션 쿠키 same-origin 유지), `/* → /index.html`(SPA 라우팅)

### 3. `backend/src/main/resources/application.yml` (수정)
- `server.port` 를 `${PORT:${SERVER_PORT:8080}}` 로 변경.
- Render가 주입하는 `PORT` 우선, 로컬은 기존 `SERVER_PORT`, 둘 다 없으면 8080.

## 배포 시 남은 수동 작업

1. GitHub 연결 → Render 대시보드 → **New → Blueprint** → 이 저장소 선택.
2. 백엔드 환경변수(SUPABASE_*) 입력.
3. 백엔드가 처음 배포된 뒤 실제 URL 확인 → `render.yaml` 의 프론트 rewrite `destination`(`https://jumisa-backend.onrender.com`)을 실제 URL로 맞춤.
4. (참고) free 플랜은 미사용 시 spin-down되어 첫 요청이 느릴 수 있음.

## 검토 필요 포인트

- 세션 쿠키 인증: 프론트의 `/api/*` rewrite 프록시로 same-origin 유지되어야 정상 동작.
- Supabase 연결: 직접연결(5432) 또는 pooler(6543, transaction). pooler 사용 시 `application.yml` 의 `prepareThreshold: 0` 주석 해제 필요.
