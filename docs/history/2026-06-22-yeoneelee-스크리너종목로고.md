# 스크리너·관심종목 종목 로고 이미지 표시 — 2026-06-22 (yeoneelee)

파일:
- `frontend/src/screens/undervalue/UndervalueScreen.tsx`
- `frontend/src/screens/watchlist/WatchlistScreen.tsx`

## 목표

저평가 스크리너와 관심종목 종목 행에 기업 로고 이미지를 표시한다.

## 변경 내용

- `UndervalueScreen.tsx`에 `StockLogo` 컴포넌트 추가 (export)
  - AlphaSquare CDN(`https://file.alphasquare.co.kr/media/images/stock_logo/kr/{stockCode}.png`)에서 로고 로드
  - 48×48 원형 이미지, `objectFit: cover`, 테두리 `T.border`
  - 이미지 우하단에 점수 오버레이 배지 (점수 기반 색상: 90↑ 초록 / 75↑ 파랑 / 60↑ 주황 / 그 외 빨강)
  - `onError` 시 기존 점수 원형 배지로 폴백
- `StockCard`의 점수 배지를 `<StockLogo>`로 교체
- `WatchlistScreen.tsx`의 `WatchCard`도 동일하게 `StockLogo` import 후 교체