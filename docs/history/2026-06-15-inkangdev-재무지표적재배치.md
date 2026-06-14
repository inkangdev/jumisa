# 재무지표 적재 배치 (금융위 공공데이터) — 2026-06-15 (inkangdev)

브랜치: `feature/finance-batch` → main 머지 (+후속 fix 머지)

저평가 점수의 **EV/EBITDA·성장률 원천**인 국내 상장사 재무제표를 금융위 공공데이터로 적재한다. (PER/PBR/EPS/BPS 는 KIS, 재무제표는 금융위)

## 확정 (실호출로 검증된 사실)

- **재무 API**: `apis.data.go.kr/1160100/service/GetFinaStatInfoService_V2/getSummFinaStat_V2`
  - 조회: `crno`(법인등록번호)+`bizYear`. 응답 JSON `response.body.items.item[]`.
  - 필드: `fnclDcd`(110 연결/120 별도), `enpSaleAmt`(매출), `enpBzopPft`(영업이익), `iclsPalClcAmt`(경상), `enpCrtmNpf`(순이익), `enpTastAmt`(총자산), `enpTdbtAmt`(총부채), `enpTcptAmt`(총자본), `fnclDebtRto`(부채비율). 단위 **원**.
- **매핑 API**: `apis.data.go.kr/1160100/GetStocIssuInfoService_V3/getItemBasiInfo_V3`
  - 조회: `basDt` 페이징. 필드: `itmsShrtnCd`(종목코드)·`crno`·`isinCd`·`scrsItmsKcd`(0101 보통주).
- 인증키: `.env` `DATA_GO_KR_SERVICE_KEY` (data.go.kr 일반 인증키). 발급 당일은 게이트웨이 401(활성화 지연) → 익일 정상. 일일 트래픽 각 10,000.
- 연결(110) 우선·없으면 별도(120) 1행/연도 / 연간 최근 2개 연도(성장률 YoY) / EBITDA≈영업이익, EV=시총+총부채−현금(1차 근사).

## 스키마 (Supabase 적용 완료)

```sql
alter table stock add column if not exists crno varchar(13);
alter table stock_financials
  add column if not exists total_asset_eok bigint, add column if not exists total_debt_eok bigint,
  add column if not exists total_equity_eok bigint, add column if not exists fncl_dcd varchar(3);
```

## 구현

- `config/FscProperties`, `dto/FscDtos`(SummFina/ItemBasi), `client/FscClient`(RestClient + `RateLimiter` 재사용, JSON tree 파싱)
- `repository`: `StockRepository.upsertCrno`/`findCommonStockCrnos`, `FinancialsRepository.upsert`
- **`financeJob` = `corpMappingStep`(종목↔법인번호 매핑) → `financeStep`(요약재무 적재)** 한 잡의 순차 step (재무가 매핑에 의존). per-종목 실패 skip+카운트.
- **배치 = 트랜잭션 풀러(6543, `BATCH_DB_URL`)** 사용 → 세션풀러(5432) 무료 15연결 한도 회피. hikari minIdle=0(유휴 시 반납).

## 실행 — 스케줄러 자동 (CLI/수동 트리거 없음)

- `spring.batch.job.enabled=false` (부팅 시 잡 자동실행 안 함 → "잡 이름 지정" 에러 회피)
- **`BatchScheduler`(기본 on, 상주)가 시간 맞춰 자동 실행**:
  - 마스터 평일 08:00 / 시세 평일 09~15시 매시 / **재무 일요일 06:00** / 정리 매일 04:30
- 즉시 1회 돌리려면: `spring.batch.job.enabled=true -Dspring.batch.job.name=financeJob` 로 실행.
- batch 는 로컬 전용(Render 미배포). IntelliJ bootRun 으로 상주.

## 검증

- API 실호출 검증(삼성 실데이터), `:batch compileKotlin`·부팅 그린.
- 첫 적재 실행: **매핑 `stock.crno` = 2,535건 적재 확인 ✅** (`select count(*) from stock where crno is not null`).
- 재무(`financeStep`)는 한 트랜잭션이라 스텝 완료 시 일괄 커밋 → 완료 후 `stock_financials(source='fsc')` 채워짐.

## 후속 / 개선 메모

- **financeStep 단일 트랜잭션(2,535종목×2년 ≈ 5천 API콜)** → 완료까지 ~10분+, 끝나야 커밋. 청크 커밋으로 분할하면 진행 가시성·내구성↑ (개선 후보).
- 재무상태표(`getBs_V2` 현금)·손익(`getIncoStat_V2` 감가상각)로 EV/EBITDA 정밀화.
- `저평가점수산출`(PER30+PBR30+EV25+성장15 → undervalue_score) — 다음 슬러그.
