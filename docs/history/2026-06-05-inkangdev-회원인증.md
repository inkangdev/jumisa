# 회원 인증 (회원가입/로그인 + Spring Security) — 2026-06-05 (inkangdev)

브랜치: `feature/auth` (main 기준)

로그인이 실제로 동작하도록 회원 테이블 + Spring Security(세션) + 회원가입 화면을 만들고, 로그인↔회원가입을 연결한다.

## 확정 결정사항

- **인증 방식**: 세션(쿠키) 기반 (Spring Security)
- **범위**: 백엔드 + 프론트 **실제 API 연동까지**
- 비밀번호: BCrypt 해시 / 로그인 ID: 닉네임(username)
- 프론트 ↔ 백엔드: vite 프록시(`/api → :8080`)로 same-origin → CORS 불필요

## 백엔드

- **`member` 테이블** (schema.sql + Supabase): id, username(unique), password(BCrypt), avatar, created_at
- 의존성 `spring-boot-starter-security` 추가
- `SecurityConfig`: 세션 기반, BCryptPasswordEncoder, `/api/auth/signup|login`·`/actuator/**`·`/dev/**` permitAll, 그 외 authenticated. CSRF 비활성(개발 단계, 추후 재검토)
- `MemberUserDetailsService`: member 테이블 기반 UserDetails 로드
- `MemberRepository`(JdbcTemplate): findByUsername / existsByUsername / insert
- `AuthController` (`/api/auth`):
  - `POST /signup` — 중복 닉네임 409, 생성 201
  - `POST /login` — 인증 후 세션에 SecurityContext 저장, 실패 401
  - `GET /me` — 현재 로그인 회원
  - `POST /logout` — 세션 무효화

## 프론트엔드

- `src/api/auth.ts` — signup/login/me/logout (fetch, credentials: include)
- `src/screens/authUi.tsx` — 공통 조각(Logo/Field/AvatarPicker/PrimaryButton/ErrorBanner/SwitchLink)
- `LoginScreen` — 닉네임/비번 + 로그인 + "회원가입" 링크 (아바타는 회원가입으로 이동)
- `SignupScreen` — 아바타 선택 + 닉네임/비번/비번확인 + 회원가입 + "로그인" 링크
- `App.tsx` — 라우팅(login/signup) + 인증 상태, 새로고침 시 `/me`로 세션 확인, 로그인 후 임시 환영 화면 + 로그아웃. 가입 성공 시 자동 로그인.

## 검증

- 백엔드 curl 플로우: 회원가입 → 로그인(쿠키) → `/me`(세션 유지) → 틀린 비번 401 → 중복 409 → 로그아웃 → 로그아웃 후 `/me` 403. **전부 정상.**
- 프론트 `npm run build`(타입체크) 통과, 로그인/회원가입 화면 렌더 확인(헤드리스 캡처).
- 테스트 회원은 검증 후 삭제(member 0건).

## 결정사항 / 추후

- **CSRF 비활성**은 개발 편의용 — 세션 쿠키 사용이므로 운영 전 재검토 필요.
- 로그인 후 화면은 임시(환영+로그아웃) — 이후 메인(스크리너 등)으로 교체.
- 초기 포인트/소셜 로그인 등 미확정 항목은 추후.

## 주의

- 아바타를 로그인 화면에서 회원가입 화면으로 이동(로그인엔 불필요).
