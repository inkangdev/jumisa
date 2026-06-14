# 재무지표 적재 배치 (금융위 공공데이터) — 2026-06-15 (inkangdev)

브랜치: `feature/finance-batch` (main 기준)

저평가 점수의 **EV/EBITDA·성장률 원천**인 국내 상장사 재무제표를 금융위 공공데이터로 적재한다. (PER/PBR/EPS/BPS 는 KIS, 재무제표는 금융위)

## 확정 (실호출로 검증된 사실)

- **재무 API**: `apis.data.go.kr/1160100/service/GetFinaStatInfoService_V2/getSummFinaStat_V2`
  - 조회: `crno`(법인등록번호)+`bizYear`. 응답 JSON `response.body.items.item[]`.
  - 필드: `fnclDcd`(110 연결/120 별도), `enpSaleAmt`(매출), `enpBzopPft`(영업이익), `iclsPalClcAmt`(경상이익), `enpCrtmNpf`(당기순이익), `enpTastAmt`(총자산), `enpTdbtAmt`(총부채), `enpTcptAmt`(총자본), `fnclDebtRto`(부채비율). 단위 **원**.
- **매핑 API**: `apis.data.go.kr/1160100/GetStocIssuInfoService_V3/getItemBasiInfo_V3`
  - 조회: `basDt`(기준일자) 페이징. 필드: `itmsShrtnCd`(종목코드)·`crno`·`isinCd`·`scrsItmsKcd`(0101 보통주).
- 인증키: `.env` `DATA_GO_KR_SERVICE_KEY` (data.go.kr 일반 인증키, 검증 완료). 일일 트래픽 각 10,000.
- 연결/별도: **연결(110) 우선, 없으면 별도(120)** 1행/연도. / 연간 최근 2~3개 연도(성장률 YoY). / EBITDA≈영업이익, EV=시총+총부채−현금(1차 근사).

## 스키마 변경 (Supabase 수동 적용 필요)

```sql
alter table stock add column if not exists crno varchar(13);          -- 법인등록번호(매핑)
alter table stock_financials
  add column if not exists total_asset_eok  bigint,                   -- 총자산(억원)
  add column if not exists total_debt_eok   bigint,                   -- 총부채(억원)
  add column if not exists total_equity_eok bigint,                   -- 총자본(억원)
  add column if not exists fncl_dcd         varchar(3);               -- 110 연결/120 별도
```
(schema.sql 에도 반영)

## 구현

- `config/FscProperties` — serviceKey + 두 base URL
- `dto/FscDtos` — `SummFina`, `ItemBasi`
- `client/FscClient` — RestClient + serviceKey 쿼리 + 기존 `RateLimiter` 재사용, JSON tree 파싱
- `repository`: `StockRepository.upsertCrno`/`findCommonStockCrnos`, `FinancialsRepository.upsert`
- `job/CorpMappingJobConfig` — `corpMappingJob`: getItemBasiInfo_V3(최근 영업일 basDt 자동탐색, 페이징) → stock.crno (보통주만)
- `job/FinanceJobConfig` — `financeJob`: crno 있는 보통주 순회 → getSummFinaStat_V2(최근 N년) → 연결우선 → stock_financials upsert. per-종목 실패 skip+카운트
- `runner/BatchCliRunner` — `corpmap` / `finance` 인자 추가

## 실행

```
cd batch && ./gradlew bootRun --args='corpmap'   # 종목↔법인번호 매핑
cd batch && ./gradlew bootRun --args='finance'   # 재무제표 적재
```

## 검증

- 로컬 `:batch compileKotlin` 그린. (트랜잭션 풀러 사용 — 연결 한도 무관)
- 실적재는 스키마 Supabase 적용 후 `corpmap` → `finance` 순.

## 후속 (별도 슬러그)

- 재무상태표(`getBs_V2` 현금)·손익(`getIncoStat_V2` 감가상각)로 EV/EBITDA 정밀화
- `저평가점수산출`(PER30+PBR30+EV25+성장15 → undervalue_score)
