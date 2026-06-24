# 라이트/다크 모드 토글 — 내정보 탭

## 목표
내정보 탭에 테마 전환 버튼을 추가한다. 선택값은 localStorage에 저장해 앱 재시작 후에도 유지.

## 구현 방식
React Context (방법 A). `T`를 정적 const → 동적 hook으로 교체.

## 색상 팔레트

| 토큰 | 다크 | 라이트 |
|------|------|--------|
| bg | #080C18 | #F0F4FF |
| card | #0F1628 | #FFFFFF |
| card2 | #141C30 | #F7F9FF |
| border | #1E2A40 | #DDE3F0 |
| text | #EDF2FF | #0D1526 |
| sub | #7A8EAA | #5A6E88 |
| mute | #2E3D55 | #C8D4E8 |
| accent | #4F8EF7 | #3B7BF5 |
| accentL | #7CB3FF | #6AA0FF |
| green | #22C77A | #17A362 |
| red | #F05454 | #E03D3D |
| amber | #F5A623 | #D4880A |
| purple | #A78BFA | #7C5FD4 |

`*Bg` 반투명 값, mono/sans 폰트는 다크/라이트 동일.

## 작업 순서

1. `theme.ts` — DARK/LIGHT 팔레트 + ThemeContext + useTheme() hook 추가. 기존 `export const T` 는 제거.
2. `App.tsx` — ThemeProvider 래핑, localStorage 키 `jumisa-theme` 으로 초기값 로드.
3. 13개 컴포넌트 — `import { T } from "../theme"` → `const T = useTheme()` 교체.
   - App.tsx, BottomNav.tsx, AppShell.tsx, authUi.tsx, LoginScreen.tsx
   - RoomWaiting.tsx, CreateRoom.tsx, BattleLobby.tsx, ActiveBattle.tsx, BattleTab.tsx
   - AiAskModal.tsx, UndervalueScreen.tsx, ScreenerScreen.tsx, WatchlistScreen.tsx
4. `AppShell.tsx` 내정보 탭 Placeholder — 토글 버튼 추가 (🌙 / ☀️).

## 주의
- BattleTab.tsx 는 theme import 없어서 수정 불필요.
- `T.mono`, `T.sans` 는 양쪽 팔레트 동일하게 유지.