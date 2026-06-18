# UI 개선 — iOS Safari 자동 줌 버그 수정

## 문제

iOS Safari에서 앱 초기 진입 시 화면 배율이 이상하게 확대되어 있는 현상.

**원인**: iOS Safari는 `font-size < 16px`인 `<input>`을 탭하면 자동으로 화면을 zoom-in하고, 포커스 해제 후에도 원래 배율로 복원되지 않음.

## 수정 내용

아래 5개 input의 `fontSize`를 16px으로 통일.

| 파일 | 용도 |
|------|------|
| `frontend/src/screens/authUi.tsx` | 로그인/회원가입 닉네임·비밀번호 입력란 |
| `frontend/src/screens/battle/CreateRoom.tsx` | 방 이름 입력 |
| `frontend/src/screens/battle/BattleLobby.tsx` | 초대코드 입력 |
| `frontend/src/screens/battle/ActiveBattle.tsx` | 종목 검색 입력 |
| `frontend/src/screens/undervalue/UndervalueScreen.tsx` | 종목 검색 입력 |

## 브랜치

`feature/ui-improve` (UI 개선 통합 브랜치 — 이후 UI 개선 작업은 이 브랜치에 계속 추가)