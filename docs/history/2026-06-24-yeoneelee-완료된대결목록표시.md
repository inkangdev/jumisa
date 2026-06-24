# 완료된 대결 목록 표시 — 2026-06-24 (yeoneelee)

## 문제

대결 기간이 지나 `BattleBotService`가 방 status를 `finished`로 바꾸면,
`listRooms`가 `finished` 방을 아예 반환하지 않아 로비에서 사라져 버렸다.

## 목표

- 로비 리스트에 **완료된 대결** 섹션을 추가해 참가했던 종료 대결을 확인할 수 있게 한다.
- 완료된 대결 카드에는 "대결 결과 보기 →" 버튼을 노출한다 (진행 중 "대결 현황 보기"와 구분).
- 결과 보기 진입 시 거래 탭을 숨기고 "🏆 최종 순위 / 💼 내 투자"만 표시한다.

## 변경 파일

### `backend/src/main/kotlin/com/jumisa/service/BattleService.kt`
- `listRooms()` 반환 맵에 `"finished"` 키 추가
  - `findRoomsByMemberAndStatus(memberId, "finished")` 로 종료된 내 대결 목록 반환

### `frontend/src/api/battle.ts`
- `RoomsResponse` 타입에 `finished: RoomSummary[]` 추가

### `frontend/src/screens/battle/BattleLobby.tsx`
- state 타입에 `finished` 추가
- 리스트 하단에 "완료된 대결" 섹션 추가
  - 회색 "종료" 뱃지, opacity 0.8 카드 스타일
  - "대결 결과 보기 →" 버튼 (테두리만 있는 ghost 스타일)
  - `onNavigate("active", r.id)` 로 결과 화면 진입

### `frontend/src/screens/battle/ActiveBattle.tsx`
- `roomStatus` state 추가, `getRoom` 응답에서 `status` 저장
- `finished`일 때 D-{daysLeft} 대신 "종료" 뱃지 표시
- `finished`일 때 탭을 "🏆 최종 순위 / 💼 내 투자"로만 구성 (거래 탭 제거)
