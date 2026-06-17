# 2026-06-17 · 내 정보 탭 — 이모지(아바타) + 닉네임 변경 기능

브랜치: `feature/profile-edit` (main 기준)

`내 정보` 탭(자리표시)에 **이모지(아바타) 변경**과 **닉네임 변경** 기능을 추가한다. 회원가입 때 정한 값을 가입 후에도 바꿀 수 있다. 즉시 서버 저장 + 화면 갱신(하단 네비/큰 아이콘 모두 반영).

## 한 일

### 백엔드
- `repository/MemberRepository.kt`
  - `updateAvatar(username, avatar)` (`update member set avatar=? where username=?`).
  - `updateUsername(currentUsername, newUsername)` (`update member set username=? where username=?`).
- `controller/AuthController.kt`
  - `POST /api/auth/avatar` — 로그인 사용자(`authentication.name`) 기준 아바타 갱신. `AVATARS` 화이트리스트(프론트 `AVATARS` 와 동일한 8종) 검증 → 목록 외 값 400.
  - `POST /api/auth/username` — 닉네임 변경. trim/공백·30자 검증, 중복 시 409(`existsByUsername`). 변경 후 **세션 principal(`authentication.name`) 갱신** — 새 `UsernamePasswordAuthenticationToken`(권한 유지)로 SecurityContext 재저장. 안 그러면 `/me`·`BattleController(auth.name→id)` 등이 옛 닉네임으로 깨짐. (배틀 데이터는 `member_id` FK 참조라 닉네임 변경 무관.)
  - 두 엔드포인트 모두 인증 필요(SecurityConfig `anyRequest().authenticated()`, 별도 permitAll 없음).

### 프론트
- `api/auth.ts` — `updateAvatar(avatar)`, `updateUsername(username)` → 각 POST, `AuthUser` 반환.
- `App.tsx` — `handleUserChange` 로 user 상태 갱신, `AppShell` 에 `onUserChange` 전달.
- `layout/AppShell.tsx`
  - `onUserChange` prop 추가 → `Placeholder` 로 전달.
  - 내 정보 탭에 `NameEditor`(닉네임 입력+저장, 변경분 있을 때만 활성)와 `AvatarEditor`(`authUi` `AvatarPicker` 재사용) 추가. 저장 시 user 갱신, "저장 중…"/오류/완료 상태 표시.
  - 다른 탭은 기존 "준비 중입니다" 유지.

## 검증

- 프론트 `tsc --noEmit` 통과. 백엔드 `./gradlew compileKotlin` BUILD SUCCESSFUL.
- 수동(예정): 내 정보 탭 → 이모지 클릭 / 닉네임 변경 → 하단 네비·아이콘·닉네임 즉시 반영, 새로고침(세션 me) 후에도 유지. 중복 닉네임 → 오류 표시.

## 후속

- 내 정보 탭 나머지 화면(보유 종목, 모의투자 통계 등 — 기능정의서 2장).
