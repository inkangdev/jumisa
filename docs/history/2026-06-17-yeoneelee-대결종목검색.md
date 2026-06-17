# 대결 거래 탭 종목 검색 — 2026-06-17 (yeoneelee)

파일: `frontend/src/screens/battle/ActiveBattle.tsx` — `TradeTab` 컴포넌트

## 목표

대결 진행 중 거래 탭에서 종목명 또는 종목코드로 종목을 검색할 수 있도록.

## 구현

- `query` state 추가
- 검색 input (종목명·종목코드 모두 매칭)
- 검색 결과 없을 때 빈 상태 메시지 표시
- 보유 종목 상단 고정 정렬 (검색 전·후 모두 적용) — 매도하기 편하도록
- 구분선 인덱스를 `sorted.length - 1` 기준으로 수정