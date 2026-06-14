# 2026-06-14 · Render 배포

Jumisa를 Render에 배포. DB(Supabase)는 외부이므로 **백엔드(Web Service) + 프론트(Static Site)** 2개만 올림.

## 배포 결과

| 서비스 | 종류 | 주소 | 비고 |
|---|---|---|---|
| `jumisa` | Static Site | https://jumisa.onrender.com | 사용자 접속 |
| `jumisa-backend` | Web Service (Docker) | https://jumisa-backend.onrender.com | API, 직접 접속 X |

DB: Supabase **세션 풀러**(`...pooler.supabase.com:5432`) 사용.

## 추가/수정 파일

- **`backend/Dockerfile`** — JDK 21 빌드 → JRE 21 실행 멀티스테이지. 이미지 빌드 시 테스트 제외(`-x test`, Supabase 연결 필요).
- **`render.yaml`** — Blueprint
  - `jumisa-backend`: `runtime: docker`, `region: singapore`, `healthCheckPath: /actuator/health`, env `SUPABASE_DB_URL/USER/PASSWORD`(`sync: false`)
  - `jumisa`: `runtime: static`, `npm ci && npm run build`, `staticPublishPath: ./dist`
    - rewrite `/api/* → 백엔드`(세션 쿠키 same-origin 유지) + `/* → /index.html`(SPA)
- **`application.yml`** — `server.port: ${PORT:${SERVER_PORT:8080}}` (Render의 `PORT` 우선)

## 연동 절차 (대시보드)

1. render.com → GitHub 가입 → Render 앱에 `jumisa` 저장소 접근 허용
2. New → Blueprint → `inkangdev/jumisa` (브랜치 `main`)
3. `SUPABASE_DB_URL/USER/PASSWORD` 입력 → 배포

## 메모

- **Blueprint는 `main` 기준** — render.yaml이 다른 브랜치에만 있으면 서비스가 안 잡힘.
- **서비스 이름 변경 시** Render가 새로 생성만 하고 기존 건 자동 삭제 안 함 → 옛 서비스는 수동 삭제.
- **Supabase**: 세션 풀러(5432)는 prepared statement 지원 → `prepareThreshold: 0` 불필요. 트랜잭션 풀러(6543) 쓸 때만 해당 설정 주석 해제.
- **Free 플랜**: 미사용 시 spin-down → 첫 요청 콜드스타트.
- 배치 스케줄러는 기본 비활성(`BATCH_SCHEDULER_ENABLED=false`).
