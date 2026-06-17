# 대결 수익률 애니메이션 — 2026-06-17 (yeoneelee)

파일: `frontend/src/screens/battle/ActiveBattle.tsx`

## 목표

대결 화면 진입 시, 그리고 10초 폴링으로 데이터가 갱신될 때마다 수익률 숫자와 바가 역동적으로 올라가는 카운트업 애니메이션 적용.

## 구현

### `useCountUp(target, duration=700)` 훅 추가

- `target`이 바뀔 때마다 이전값 → 새 값으로 easeOutCubic 애니메이션
- `requestAnimationFrame` 기반, 언마운트 시 정리
- 폴링 갱신(10초) 때도 자동 재트리거

### 적용 위치

**내 순위 카드 (헤더)**
- `myEntry.returnRate` → `useCountUp`으로 애니메이션된 값 표시

**순위 탭 각 참가자 행**
- 훅은 컴포넌트 단위로만 쓸 수 있으므로 `AnimatedRankRow` 컴포넌트로 분리
- 수익률 숫자 + 카드 하단 인라인 바가 함께 카운트업
- 기존 별도 "수익률 비교" 섹션 제거 → 각 카드 안에 바 내장