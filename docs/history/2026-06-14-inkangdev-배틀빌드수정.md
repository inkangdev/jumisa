# 2026-06-14 · 배틀 프론트 빌드 실패 수정 (미사용 user prop)

브랜치: `fix/battle-unused-user-prop` (main 기준)

## 증상

배틀 머지 후 Render 프론트 배포가 안 넘어감(라이브 번들 해시 ~15분간 불변). `npm run build`(tsc)가 실패한 정황.

## 원인

`feature/battle`은 main이 아니라 **Render가 한 번도 빌드한 적이 없고**, 작업이 `vite dev`(esbuild, 타입체크 안 함)로만 검증됐을 가능성. `npm run build`의 tsc strict 검사가 main 머지 후 처음 돌면서 노출됨.

- `frontend/src/screens/battle/BattleLobby.tsx` — `user` prop을 구조분해만 하고 본문 미사용
- `frontend/src/screens/battle/CreateRoom.tsx` — 동일

tsconfig `noUnusedLocals: true` → `'user' is declared but its value is never read` 로 빌드 실패.

## 진단 방법 (node 없는 환경)

이 PC엔 node/npm·node_modules가 없어 로컬 tsc 불가. Render 로그도 미열람. 대신 배틀 프론트 파일을 정적 전수 검사(미사용 import/지역변수/콜백 인덱스/헬퍼 prop/구조분해/null 가드/`battle.*` export 일치)로 좁혀 두 군데를 특정.

## 수정

- 두 컴포넌트의 구조분해에서 `user` 제거(`{ onNavigate }`, `{ onBack, onCreated }`). Props 타입의 `user: AuthUser`는 유지 → 호출부(BattleTab)는 그대로 `user` 전달 가능, 미사용 에러만 해소.

## 검증

- 머지 후 Render 빌드 + 라이브 번들 해시 변경으로 확인(배포 성공 = tsc 통과).
- 번들이 바뀌면 대결 탭의 로비/방생성 화면이 실제 노출.
