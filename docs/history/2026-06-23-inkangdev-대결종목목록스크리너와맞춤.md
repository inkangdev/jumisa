# 대결 거래 종목 목록을 스크리너와 맞춤 (검색 누락 수정)

작업자: inkangdev / 2026-06-23

## 증상
저평가 스크리너엔 나오는 종목이 대결 거래 검색에선 꽤 빠짐.

## 원인
두 화면의 종목 소스/쿼리가 달랐음.
- 스크리너(`ScreenerRepository`): `undervalue_score`(최신일) **전체**, 가격 LEFT JOIN, **LIMIT 없음**.
- 대결(`BattleRepository.findKrStocksWithLatestPrice`): `stock` + 최근 **3일** 스냅샷 INNER JOIN, `order by stock_code` **LIMIT 200**.
  → 코드순 앞 200개 + 최근 3일 시세 있는 것만 → 그 외 검색 불가(프론트가 이 목록을 클라이언트 필터).

핵심: **LIMIT 200**(결정타) + 3일 시세창.

## 수정
`findKrStocksWithLatestPrice`:
- **LIMIT 200 제거**(+ limit 파라미터 제거).
- **시세창(3일) 제거** → 종목별 **최신 스냅샷 1건** 기준. 체결가(`findLatestPrice`)와 동일 기준이라 목록↔체결 일관. 인트라데이 7일 보관이라 자연 상한.
- 유지: `is_tradable = true`, 시세 있는 종목만(대결은 시장가 체결이라 현재가 필수).

호출부(`listKrStocks`, 봇 후보군 `BattleBotService`) 모두 무인자라 영향 없음.

## 검증
- `compileKotlin` 통과, 새 SQL 직접 실행 유효(전체 반환).
- 남는 정당한 차이: 스크리너엔 보여도 **시세 없는 종목**은 거래 불가라 대결 목록에서 제외(의도).

## 비고(후속)
- 종목이 많아지면 클라이언트 필터 대신 서버 검색 엔드포인트 고려.
- 장기 휴장 시 7일 보관 정리로 스냅샷이 비면 거래 불가해질 수 있음(데이터 가용성 이슈, 별건).
