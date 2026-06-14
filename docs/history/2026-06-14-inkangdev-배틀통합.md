# 2026-06-14 · feature/battle 머지 + 메인 셸 통합

브랜치: `feature/battle-integration` (main 기준)

`feature/battle`(모의투자 대결, yeoneelee)을 main에 머지하면서, 그 사이 main에 새로 들어온 메인 셸(AppShell)과 정합시킨다.

## 충돌 범위

battle은 옛 main(7061bd9, auth)에서 분기 → 그 뒤 main에 프론트 셸/배포/문서가 다수 추가됨. 겹쳐서 바뀐 파일은 **`frontend/src/App.tsx` 하나뿐**. 나머지(배틀 백엔드 `battle/`, `schema.sql` 배틀 테이블, 배틀 화면 4종, `api/battle.ts`, 문서)는 자동 병합.

## 해결

- **App.tsx**: main 버전(인증 게이트 → `AppShell`) 채택. battle의 자체 셸/네비/MoreScreen은 버림(셸은 main의 공용 AppShell로 일원화).
- **배틀 화면 정합**: battle의 App.tsx가 갖던 배틀 네비 로직(`battleView`/`roomId` → 로비/생성/대기/진행)을 신설 `screens/battle/BattleTab.tsx`로 이동.
- **AppShell**: `tab === "battle"`이면 자리표시 대신 `<BattleTab user={user}/>` 렌더. 통합 지점은 탭 id `"battle"`(앞서 합의한 대로).

## 신규/수정

- 신규 `frontend/src/screens/battle/BattleTab.tsx` — 대결 탭 호스트(배틀 흐름 상태 캡슐화).
- 수정 `frontend/src/layout/AppShell.tsx` — battle 탭에서 BattleTab 렌더.
- 머지로 유입: `backend/.../battle/*`, `schema.sql`(battle_room/participant/holding/trade), `frontend/src/api/battle.ts`, `screens/battle/{BattleLobby,CreateRoom,RoomWaiting,ActiveBattle}.tsx`, 문서(기능정의서_v1.1, 작업슬러그_v1.1).

## 검증

- 로컬 빌드 불가(node 없음) → 타입 정합 리뷰: 배틀 화면 Props(user/onBack/onNavigate/onCreated/onStarted/roomId)와 BattleTab 제공값 일치 확인, `BattleView` 유니온 동일, api/battle.ts export 타입 일치.
- 최종 검증: main 머지 후 Render `jumisa` 빌드(tsc) + 라이브 번들 해시 변경.
- 수동: 로그인 → 대결 탭 → 방 생성/입장/시작/거래/순위. (회원 2명)

## 주의

- **DB 스키마 수동 적용 필요**: `schema.sql`의 battle 테이블 4종을 Supabase SQL 에디터에서 적용해야 대결 API가 동작.
- 배틀은 Phase 1(국내 종목, 1시간 적재가) — 미국/환율, 종료 정산 스케줄러는 후속.

## 다음

- 이 머지 후 백엔드 패키지 구조 리팩터링(도메인 우선) 진행 예정.
