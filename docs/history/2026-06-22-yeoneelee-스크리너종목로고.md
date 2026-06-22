# 스크리너 종목 로고 이미지 표시 — 2026-06-22 (yeoneelee)

파일: `frontend/src/screens/undervalue/ScreenerScreen.tsx`

## 목표

저평가 스크리너 종목 행에 기업 로고 이미지를 표시한다.

## 변경 내용

- `StockLogo` 컴포넌트 추가
  - AlphaSquare CDN(`https://file.alphasquare.co.kr/media/images/stock_logo/kr/{stockCode}.png`)에서 로고 로드
  - 44×44 원형 이미지, `objectFit: cover`, 테두리 `T.border`
  - 이미지 우하단에 점수 오버레이 배지 (점수 기반 색상: 90↑ 초록 / 75↑ 파랑 / 60↑ 주황 / 그 외 빨강)
  - `onError` 시 기존 점수 원형 배지로 폴백
- 기존 점수 원형 배지 렌더를 `<StockLogo>` 호출로 교체
