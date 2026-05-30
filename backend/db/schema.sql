-- ============================================================
-- Jumisa 초기 스키마 v1
-- 출처: KIS 국내주식 현재가 시세(TR FHKST01010100) 응답 필드 기반
-- 데이터 변경 주기로 테이블 분리: 마스터(불변) / 시세(시간별) / 가치지표(일별)
-- 적용: Supabase SQL Editor 또는 JDBC 로 실행 (public 스키마)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) 종목 마스터: 거의 변하지 않는 기초정보
-- ─────────────────────────────────────────────
create table if not exists stock (
    stock_code        varchar(6)  primary key,                -- 종목코드 (예: 005930)
    name              varchar(100),                           -- 종목명 (KIS 시세엔 없음 → 별도 보강)
    market            varchar(20),                            -- 시장구분 (KOSPI/KOSDAQ/KOSPI200), rprs_mrkt_kor_name
    sector            varchar(50),                            -- 업종명 (bstp_kor_isnm, 예: 전기·전자)
    listed_shares     bigint,                                 -- 상장주식수 (lstn_stcn, 단위: 주)
    face_value        integer,                                -- 액면가 (stck_fcam, 단위: 원)
    capital_eokwon    bigint,                                 -- 자본금 (cpfn, 단위: 억원)
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on table  stock                is '종목 기초정보 마스터 (거의 불변)';
comment on column stock.stock_code     is '종목코드 6자리';
comment on column stock.name           is '종목명 (KIS 현재가 응답에 없어 별도 소스로 보강)';
comment on column stock.market         is '시장구분 (KOSPI/KOSDAQ/KOSPI200)';
comment on column stock.sector         is '업종명';
comment on column stock.listed_shares  is '상장주식수(주)';
comment on column stock.capital_eokwon is '자본금(억원)';

-- ─────────────────────────────────────────────
-- 2) 시세 스냅샷: 1시간 단위 적재 (시계열)
-- ─────────────────────────────────────────────
create table if not exists stock_price_snapshot (
    id                  bigint generated always as identity primary key,
    stock_code          varchar(6)  not null references stock(stock_code),
    snapshot_at         timestamptz not null,                 -- 적재 시각 (수집 시점)
    current_price       integer     not null,                 -- 현재가 (stck_prpr, 원)
    prev_day_diff       integer,                              -- 전일대비 (prdy_vrss, 원)
    prev_day_sign       varchar(1),                           -- 전일대비부호 (prdy_vrss_sign: 1상한 2상승 3보합 4하락 5하한)
    change_rate         numeric(7,2),                         -- 등락률 (prdy_ctrt, %)
    open_price          integer,                              -- 시가 (stck_oprc)
    high_price          integer,                              -- 고가 (stck_hgpr)
    low_price           integer,                              -- 저가 (stck_lwpr)
    upper_limit         integer,                              -- 상한가 (stck_mxpr)
    lower_limit         integer,                              -- 하한가 (stck_llam)
    accum_volume        bigint,                               -- 누적거래량 (acml_vol, 주)
    accum_trade_amount  bigint,                               -- 누적거래대금 (acml_tr_pbmn, 원)
    market_cap_eokwon   bigint,                               -- 시가총액 (hts_avls, 억원)
    created_at          timestamptz not null default now(),
    unique (stock_code, snapshot_at)
);

comment on table stock_price_snapshot is '1시간 단위 시세 스냅샷 (시계열, 랭킹 히스토리 근거)';

-- 최신 시세 조회 / 시계열 조회용 인덱스
create index if not exists idx_snapshot_stock_time
    on stock_price_snapshot (stock_code, snapshot_at desc);
create index if not exists idx_snapshot_time
    on stock_price_snapshot (snapshot_at);

-- ─────────────────────────────────────────────
-- 3) 가치지표: 일별 갱신 (저평가 점수 산출 근거)
-- ─────────────────────────────────────────────
create table if not exists stock_valuation (
    id                 bigint generated always as identity primary key,
    stock_code         varchar(6)  not null references stock(stock_code),
    base_date          date        not null,                  -- 기준일
    per                numeric(12,2),                         -- PER (per) — 주가수익비율
    pbr                numeric(12,2),                         -- PBR (pbr) — 주가순자산비율
    eps                numeric(14,2),                         -- EPS (eps, 원) — 주당순이익
    bps                numeric(14,2),                         -- BPS (bps, 원) — 주당순자산
    vol_turnover_rate  numeric(8,2),                          -- 거래량회전율 (vol_tnrt, %)
    w52_high           integer,                               -- 52주 최고가 (w52_hgpr)
    w52_low            integer,                               -- 52주 최저가 (w52_lwpr)
    created_at         timestamptz not null default now(),
    unique (stock_code, base_date)
);

comment on table stock_valuation is '일별 가치지표 (PER/PBR/EPS/BPS 등) — 저평가 점수 산출 근거';

-- 특정일 전체 종목 랭킹 산출용 인덱스
create index if not exists idx_valuation_date
    on stock_valuation (base_date);
