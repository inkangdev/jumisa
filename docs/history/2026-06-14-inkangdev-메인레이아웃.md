# 2026-06-14 · 메인 레이아웃(App Shell) — 틀만

브랜치: `feature/main-layout` (main 기준)

로그인 이후 화면들을 담을 **공통 틀(앱 셸 + 하단 4탭 네비)** 을 만든다. **틀만** — 개별 화면(스크리너/대결/관심종목/더보기)은 만들지 않는다.

기준 시안: `docs/design/remixed-13412f58.tsx` (모바일 폰 목업: 상태바/콘텐츠/하단 4탭/홈바).

## 확정 결정

1. **웹 레이아웃**: 중앙정렬 모바일 컬럼(max-width 420). 시안의 폰 프레임/상태바/홈바 목업 크롬은 제외(로그인 화면 이관 방침과 동일). 하단 네비는 실제 UI.
2. **탭 콘텐츠**: 셸 내부 자리표시 1개(활성 탭 아이콘+이름 + "준비 중입니다"). 탭별 화면 파일 없음.
3. **로그아웃**: 더보기 탭 자리표시 안에 작은 로그아웃 버튼만(기존 임시 환영화면의 로그아웃을 여기로 이관). `MoreScreen` 파일 안 만듦.

## 한 일

신규 (`frontend/src/layout/`):

- `nav.ts` — 탭 단일 소스. `AppTab` 타입 + `NAV` 배열(🔍스크리너/⚔️대결/⭐관심종목/☰더보기). 시안 `NAV` 이식.
- `BottomNav.tsx` — 하단 4탭 네비(시안 Bottom Nav 이식). 활성 `T.accent/accentBg`, 비활성 `T.mute`.
- `AppShell.tsx` — 로그인 후 프레임. 중앙정렬 컬럼(maxWidth 420, height 100dvh) + 콘텐츠 자리표시 + `BottomNav`. `useState<AppTab>("screener")`. 더보기 탭에서만 로그아웃 노출.

수정:

- `App.tsx` — 로그인 성공 시 임시 `AuthedView` 대신 `<AppShell>` 렌더(`AuthedView` 제거). 인증 게이트(booting/login/signup)·부팅 로딩 화면은 유지. 셸은 자체 풀하이트 프레임을 가지므로 로그인 시엔 기존 maxWidth:400 래퍼를 거치지 않도록 분기.

## battle 정합 (머지 시 가이드 — 이번 코드 변경 없음)

`feature/battle`은 App.tsx에 자체 셸/네비를 갖고 있다. 머지 시 공용 `layout/nav`·`AppShell`·`BottomNav`를 쓰도록 교체하고, battle 뷰 로직은 **탭 id `"battle"`** 자리에 끼운다.

## 검증

- 이 PC엔 node/npm·node_modules 없음 → 로컬 `npm run build` 미실행. tsconfig 엄격 옵션(`verbatimModuleSyntax`, `noUnusedLocals/Parameters`) 기준으로 import `type` 표기·미사용 변수 없음을 코드 리뷰로 확인.
- 최종 빌드 검증: node 환경 `cd frontend && npm ci && npm run build` 또는 main 머지 후 Render `jumisa` 빌드 로그.
- 수동: 로그인 → 하단 4탭 노출 → 탭 전환 시 자리표시 변경 → 더보기 로그아웃 → 로그인 화면 복귀.

## 범위 밖 (후속)

- 탭별 실제 화면/기능/API, 미국 시장, 데스크톱 반응형, 별도 MoreScreen.
