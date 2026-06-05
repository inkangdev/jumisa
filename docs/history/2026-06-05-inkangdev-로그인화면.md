# 로그인 화면 구현 — 2026-06-05 (inkangdev)

브랜치: `feature/login-page` (main 기준)

화면기획서 초안(`docs/design/remixed-13412f58.tsx`)의 로그인 화면을 frontend에 실제 컴포넌트로 옮긴다. **화면만 — API 미연동.**

## 목표

- 디자인 초안의 `LoginScreen`을 React+TS로 재구성(프로토타입 → 유지보수 가능한 컴포넌트).
- 로그인 동작/백엔드 연동은 다음 단계, 이번엔 **UI만**.

## 한 일

- `src/screens/LoginScreen.tsx` — 로그인 화면(타입 적용): 로고, 아바타 8종 선택, 닉네임/비밀번호 입력, "대결 시작하기" 버튼, 카카오·네이버 소셜 버튼, 가입 혜택 배너. 로그인은 `onLogin` 콜백 stub.
- `src/theme.ts` — 디자인 토큰(`T`) 분리.
- `src/App.tsx` — 폰 프레임(390×812) + 상태바 + 홈 인디케이터 안에 로그인 화면 렌더.
- `index.html` — 구글폰트(Noto Sans KR + JetBrains Mono) `<link>` 추가, title `Jumisa`, lang `ko`.
- `src/index.css` — 미니멀 리셋(스타터 스타일 제거).
- Vite 스타터 잔재(`App.css`, 데모 UI) 제거.

## 초안 대비 개선

- 폰트 주입을 `document.createElement`(import 부작용) → `index.html` `<link>`로 교체.
- 인라인 1,100줄 단일 파일 → 컴포넌트 + 토큰 분리, props 타입 명시.

## 검증

- `npm run build`(tsc 타입체크 + vite build) 통과.
- dev 서버 + 헤드리스 캡처로 렌더 확인(디자인대로 표시).

## 결정사항 / 합의 필요

- 초안이 가정한 값들은 **미확정**: 초기 포인트 1,000,000P, 소셜(카카오/네이버), 카피("대결 시작하기"). 팀 확정 필요.

## 다음 할 일

- 로그인 API 연동(백엔드 회원/인증 — 기능정의서 로그인 영역, 아직 미구현).
- 다음 화면: 스크리너 등.

## 미커밋 / 주의

- 화면만이라 인증/세션 없음. `onLogin`은 `console.log` stub.
