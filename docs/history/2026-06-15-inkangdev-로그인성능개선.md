# 로그인 성능 개선 (DB 왕복 절감 · 커넥션 내구성 · 콜드스타트 keep-alive)

작성/실행: 2026-06-15, inkangdev

## 배경 / 문제

"로그인이 느리다"는 의심(특히 Supabase 커넥션 문제 이력)에 대해 실측 진단.

실측(워밍 상태, 한국→Render 싱가포르):
- `/actuator/health`(DB 핑 1회): ~0.5s
- `/api/auth/me`(DB 미조회): ~0.18s ← 순수 네트워크 기준선
- `/api/auth/login`: **~0.7s** (멈춤·에러 없음)

판정:
- 콜드스타트도, 커넥션 고갈/죽은 커넥션으로 인한 30초 멈춤도 **현재는 재현 안 됨**.
- 워밍 시 ~0.7s 는 **로그인당 DB 왕복 2회 + BCrypt(라운드10)** 누적.
  - 2회 중 1회는 `AuthController:66` 의 **불필요한 중복 조회**(avatar 용).
- HikariCP 는 `maximum-pool-size:5` 만 설정, 나머지 기본값 → idle 끊김 시 예전 커넥션 사고 **재발 소지**(상시 느림 원인은 아님).
- 첫 로그인 ~40초는 Render 무료 콜드스타트(`docs/ops/배포.md:69`).

## 실행한 작업

### 1) 로그인 중복 DB 조회 제거 (왕복 2회 → 1회)
- `backend/.../service/MemberPrincipal.kt` 신규: `User` 에 `avatar` 를 실은 커스텀 principal.
- `MemberUserDetailsService.loadUserByUsername` 가 `MemberPrincipal` 반환.
- `AuthController.login` 은 `auth.principal` 의 avatar 를 사용 → `repo.findByUsername(auth.name)` 제거.
- `GET /api/auth/me` 는 변경 없음(매번 DB 에서 최신 avatar 조회 — 내정보 변경 반영 위해 의도적 유지).

### 2) HikariCP 내구성 튜닝 (`backend/.../application.yml`)
- `connection-timeout: 10000` — 풀 고갈 시 30초 대신 10초에 빠른 실패.
- `keepalive-time: 120000` — idle 커넥션 2분마다 살려 Supabase/네트워크 idle 끊김 예방.
- `max-lifetime: 1500000` — 30분(기본)보다 짧게 재생성, 오래된/끊긴 커넥션 누적 방지.

### 3) 콜드스타트 keep-alive (`.github/workflows/keep-alive.yml` 신규)
- GitHub Actions cron `*/10 * * * *` 로 백엔드(`/actuator/health`)·AI(`/ai/health`) 핑.
- Render 무료 spin-down(~15분) 전에 깨워둠. 프론트는 Static Site 라 대상 아님.
- `workflow_dispatch` 로 수동 실행도 가능. (cron 은 혼잡 시 지연 가능 — best effort)

## 검증

- `backend/gradlew -p backend compileKotlin` → BUILD SUCCESSFUL.
- 배포 후 확인 예정:
  - 워밍 상태 `login` 응답시간이 `health` 수준(~DB 1왕복)으로 단축되는지.
  - keep-alive 동작 후 첫 로그인의 ~40초 콜드스타트가 사라지는지.

## 미적용 / 보류

- BCrypt 라운드 하향(10→8): 보안 트레이드오프라 보류.
- 세션 스토어(Redis 등): 현재 범위 외.
