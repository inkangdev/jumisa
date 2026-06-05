# 시세 데이터 적재 배치 — 2026-06-05 (inkangdev)

브랜치: `feature/price-batch` (main 기준)

KIS 시세 API + 종목 테이블을 바탕으로, 지속적으로 데이터를 적재하는 배치를 만든다.
기능정의서(`docs/기능정의서_v1.0.md`) 취지에 맞춰 데이터 소스·주기·보관 정책·테이블을 재설계했다.

## 목표

- 저평가 스크리너 / 모의투자 기준가 / 랭킹 히스토리를 떠받칠 **데이터 파이프라인** 구축.
- 이번 범위는 **데이터 적재까지만**. 저평가 점수/랭킹 산출은 PER/PBR 가중치(미결) 확정 후 별도.

## 확정 결정사항

- **작업 범위**: 적재 배치까지만 (점수/랭킹 산출 제외)
- **종목 범위**: KOSPI + KOSDAQ 전체 (보통주 필터링)
- **저장 전략**: 티어드 보관 (무료 Supabase 유지)
- **KIS 앱키**: 시세 수집은 **실전(prod) 앱키** 사용 (모의 vts는 전체 폴링에 유량 부적합)
- **화면 기획**: 기능정의서로 충분 (별도 화면 기획서 없음)

## 핵심 근거 (KIS 깃 + API 명세 조사 결론)

데이터는 3개 층으로 나뉜다:

1. **GitHub 레포**(`koreainvestment/open-trading-api`) = 파서 코드 + 필드 명세. 데이터 아님.
2. **공개 마스터 파일**(`new.real.download.dws.co.kr/common/master/{kospi,kosdaq}_code.mst.zip`) = **토큰 없이** 받는 전 종목 베이스 데이터. (다운로드·파싱 가능 확인됨: KOSPI 2,549 + KOSDAQ 1,823)
3. **실시간 API**(`inquire-price` 등) = 앱키+토큰 필요한 시세/가치지표.

### 데이터 소스 분담

| 소스 | 콜 비용 | 빈도 | 데이터 |
|------|---------|------|--------|
| 마스터 파일 (공개) | 파일 1개 | 1일 1회 | 종목명·표준코드·시장·업종·시총규모·**거래상태**·연간재무(매출/영업이익/순이익/ROE) |
| `chk-holiday` (CTCA0903R) | 1콜 | 1일 1회(캐시) | 개장일 여부 → 배치 게이트 |
| `inquire-price` (FHKST01010100, 종목별) | ~2,800콜 | 마감 1회 | 종가+PER/PBR/EPS/BPS/52주 → `stock_daily` |
| `inquire-price` (종목별) | ~2,800콜 | 장중 매시 | 현재가 → `stock_price_snapshot` |
| `finance_financial_ratio` (종목별) | 종목별 | 분기 | ROE/EPS/BPS/부채비율 보강 |

### 조사 중 확인된 사실 (정정 포함)

- ❌ **멀티시세**(`intstock-multprice`, 30종목/콜)는 응답에 **현재가·PER/PBR이 없음**(등락률/거래량/잔량만) → 적재용 부적합. 현재가+가치지표는 종목별 `inquire-price` 필수. (멀티시세는 추후 관심종목 화면용)
- ✅ **휴장일 API 존재** → "거래일에만 실행" 정확히 처리 가능 (1일 1회 호출 권장 → 캐시).
- ✅ **재무비율 API 패밀리** → 공공데이터 없이 KIS만으로 분기 재무 보강 가능.
- ⚠️ **KIS 토큰**: "1일 1회 발급 원칙, 잦은 발급 시 제한" → 토큰 영속 캐시 + 만료 직전 갱신 필요. (현재 `KisClient`는 메모리 캐시 + 갱신 없음 → 재설계 대상)
- ⚠️ **유량**: 실전 초당 20건(실무 15건 권장), `EGW00201` 초과 시 1초 대기 재시도.

### 저장 용량 (Supabase 무료 500MB)

- 장중 시세 전체 종목 시간당 적재 = 용량 주범. **7일 롤링 삭제 시 ~55MB에서 고정.**
- 일봉(장기 보관)은 ~200MB/년 증가 → 1년차 여유, 2년차쯤 Pro($25)/다운샘플 재검토.

## 스키마 (schema.sql v2 — 적용 완료 ✅)

Supabase 적용·검증 완료 (node+pg 마이그레이션):

- `stock` — 컬럼 11개 추가: `std_code, security_type, cap_size_class, settle_month, is_tradable, is_admin_issue, is_trading_halt, is_liquidation, market_warning, is_short_overheat, status_at`
- `stock_financials` — 신규 (연간/분기 재무)
- `stock_price_snapshot` — 유지 (인트라데이, 7일 보관)
- `stock_daily` — 신규 (종가 OHLC + 가치지표, 장기 보관). `stock_valuation` 흡수·drop
- `undervalue_score` — 신규 (스키마만, 적재 보류)

## 배치 설계 (구현 예정)

| Job | 내용 | 주기(KST, 주말+휴장 제외) |
|-----|------|------|
| `holidayJob` | `chk-holiday`로 개장일 캐시 | 08:00 (또는 연 1회 프리로드) |
| `stockMasterJob` | 마스터 파일 다운로드·파싱 → `stock` + `stock_financials(연간)` upsert | 08:00 |
| `priceSnapshotJob` | 거래가능 종목 순회 → 현재가 → `stock_price_snapshot` | 09:00~15:00 매시 |
| `closingJob` | 마감 스윕 → `stock_daily`(종가+가치지표) 적재 | 15:30 |
| `cleanupJob` | 7일 경과 인트라데이 삭제 | 새벽 |
| (분기) `financeJob` | `finance_financial_ratio` → `stock_financials` 보강 | 분기 |

- 공통: 거래상태로 정지/관리/정리 종목 폴링 제외. per-종목 실패는 skip(전체 job 안 죽임) + 카운트 로깅.
- 스로틀: 초당 ~15건 RateLimiter, `EGW00201` 재시도.
- `@Scheduled`(Asia/Seoul) + JobLauncher. `batch.job.enabled=false` 유지.

## 구현 진척

- [x] `KisClient` 보강: 토큰 **파일 영속 캐시 + 만료 직전 갱신**, 현재가 타입 파싱(`CurrentPrice` DTO), `RateLimiter`(초당 유량)
- [x] 마스터 파서 `KisMasterClient`: cp949 고정폭 파싱(공식 레이아웃 포팅), 보통주 필터
- [x] 데이터 접근: **JdbcTemplate 채택**(JPA 대신, 외부관리 스키마 ETL에 적합) — `StockRepository`, `PriceRepository`, `PriceSnapshot`
- [x] `stockMasterJob`: 마스터 파일 → `stock` upsert. **실행·검증 완료**(2,535종목, 수동 시드와 일치)
- [x] `priceSnapshotJob`: 거래가능 종목 순회 → 현재가 → `stock_price_snapshot`. 종목별 실패 스킵. (코드 완성, 실폴링은 prod 앱키 시점)
- [x] `BatchScheduler`(Asia/Seoul, 주말 제외, **기본 off** `jumisa.batch.scheduler-enabled`): 마스터 08:00 / 시세 09~15시 매시 / 정리 04:30(7일)
- [x] 수동 트리거 `DevBatchController` (`POST /dev/batch/master|price`)
- [x] 마스터 시드(수동 1회) — 이후 `stockMasterJob`으로 정식화됨

### 남은 TODO

- [ ] **실전(prod) 앱키** 발급·`.env` 반영 후 시세 폴링 전체 검증
- [ ] `closingJob`(일봉 `stock_daily` 적재) + 분기 `financeJob`(재무비율 보강)
- [ ] 휴장일 캐시(`chk-holiday` 연동) → 스케줄러 게이트
- [ ] 재무·sector(업종명) 보강(`sector_code` 마스터)

## 미결 / 주의

- 저평가 점수 PER/PBR **가중치 미결** → `undervalue_score` 적재는 보류.
- 실전 앱키 발급/`.env` 반영 필요 (현재 `KIS_ENV=vts`).
- `schema.sql` 변경 + 본 문서는 **아직 미커밋** (`feature/price-batch`).
- 임시 dev 컨트롤러(`DevKisController`/`DevDbController`)는 본 기능 구현 후 정리.
