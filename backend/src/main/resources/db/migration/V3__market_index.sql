-- ─────────────────────────────────────────────
-- 시장 지수 일별 시세 (대시보드 '주요 지수' 근거)
-- 코스피/코스닥/코스피200 지수값. 마감 후 1회 적재(stock_daily 와 동일 주기).
-- 소스: KIS 국내업종 현재지수(TR FHPUP02100000).
-- ─────────────────────────────────────────────
create table if not exists market_index_daily (
    index_code   varchar(8)  not null,                    -- 0001 코스피 / 1001 코스닥 / 2001 코스피200
    index_name   varchar(20) not null,                    -- 표시명 (코스피 등)
    base_date    date        not null,                     -- 기준일
    close_index  numeric(12,2),                            -- 종가 지수
    prev_diff    numeric(12,2),                            -- 전일대비
    prev_sign    varchar(1),                               -- 전일대비부호 (1상한 2상승 3보합 4하락 5하한)
    change_rate  numeric(7,2),                             -- 등락률 (%)
    open_index   numeric(12,2),                            -- 시가 지수
    high_index   numeric(12,2),                            -- 고가 지수
    low_index    numeric(12,2),                            -- 저가 지수
    volume       bigint,                                   -- 누적 거래량 (주)
    trade_amount bigint,                                   -- 누적 거래대금 (원)
    created_at   timestamptz not null default now(),
    primary key (index_code, base_date)
);

comment on table market_index_daily is '시장 지수 일별 시세: 코스피/코스닥/코스피200 (마감 후 1회 적재) — 대시보드 주요 지수';

create index if not exists idx_market_index_date on market_index_daily (base_date);
