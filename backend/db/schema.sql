-- ============================================================
-- Jumisa 스키마 v2
-- 데이터 소스: KIS 공개 마스터 파일(종목/거래상태/연간재무) + KIS Open API(시세/가치지표)
-- 변경 주기/보관 정책으로 테이블 분리:
--   stock              마스터(불변+거래상태)        ← 마스터 파일, 1일 1회
--   stock_financials   재무(연간/분기)              ← 마스터 파일 + 재무비율 API
--   stock_price_snapshot 인트라데이 시세(1시간)      ← inquire-price, 7일 보관
--   stock_daily        일봉(종가+가치지표)          ← inquire-price 마감 1회, 장기 보관
--   undervalue_score   저평가 점수/랭킹(스키마만)    ← 가중치 확정 후 적재
-- 적용: Supabase(public 스키마). 신규 생성 시 본 파일 전체 실행.
-- ============================================================

-- ─────────────────────────────────────────────
-- 1) 종목 마스터: 기초정보 + 거래상태 (마스터 파일에서 적재)
-- ─────────────────────────────────────────────
create table if not exists stock (
    stock_code        varchar(6)  primary key,                -- 단축 종목코드 (예: 005930)
    name              varchar(100),                           -- 한글 종목명 (마스터 파일)
    std_code          varchar(12),                            -- 표준코드(ISIN)
    crno              varchar(13),                            -- 법인등록번호 (금융위 재무 API 조회키)
    market            varchar(20),                            -- 시장구분 (KOSPI/KOSDAQ)
    sector            varchar(50),                            -- 업종명 (지수업종 분류)
    security_type     varchar(20),                            -- 증권구분 (보통주/우선주/ETF/ETN/리츠/SPAC) — 보통주 필터
    cap_size_class    varchar(10),                            -- 시총규모 (대형/중형/소형)
    listed_shares     bigint,                                 -- 상장주식수 (주)
    face_value        integer,                                -- 액면가 (원)
    capital_eokwon    bigint,                                 -- 자본금 (억원)
    settle_month      smallint,                               -- 결산월
    -- 거래상태 (폴링 대상 판단 + 스크리너 필터)
    is_tradable       boolean     not null default true,      -- 거래가능 여부 (정지/정리/관리 아니면 true)
    is_admin_issue    boolean     not null default false,     -- 관리종목
    is_trading_halt   boolean     not null default false,     -- 거래정지
    is_liquidation    boolean     not null default false,     -- 정리매매
    market_warning    varchar(10),                            -- 투자경고/주의/위험 (없으면 null)
    is_short_overheat boolean     not null default false,     -- 공매도과열
    status_at         timestamptz,                            -- 거래상태 갱신 시각
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

comment on table  stock                 is '종목 기초정보 + 거래상태 마스터 (KIS 마스터 파일, 1일 1회 갱신)';
comment on column stock.security_type   is '증권구분 (보통주 필터링 기준)';
comment on column stock.is_tradable     is '거래가능 여부 (시세 폴링 대상 판단)';
comment on column stock.market_warning  is '시장경고 단계 (투자경고/주의/위험)';

-- ─────────────────────────────────────────────
-- 2) 재무: 연간(마스터) + 분기(재무비율 API)
-- ─────────────────────────────────────────────
create table if not exists stock_financials (
    stock_code     varchar(6)  not null references stock(stock_code),
    base_ym        varchar(6)  not null,                      -- 기준년월 (예: 202412)
    revenue_eok    bigint,                                    -- 매출액 (억원)
    op_profit_eok  bigint,                                    -- 영업이익 (억원)
    ord_profit_eok bigint,                                    -- 경상이익 (억원)
    net_income_eok bigint,                                    -- 당기순이익 (억원)
    total_asset_eok  bigint,                                  -- 총자산 (억원)   — 금융위 요약재무 (EV/지표)
    total_debt_eok   bigint,                                  -- 총부채 (억원)   — 금융위 요약재무 (EV)
    total_equity_eok bigint,                                  -- 총자본 (억원)   — 금융위 요약재무
    fncl_dcd       varchar(3),                                -- 재무제표구분 (110 연결 / 120 별도)
    roe            numeric(8,2),                              -- ROE (%)        — 마스터(연간)
    eps            numeric(14,2),                             -- EPS (원)       — 재무비율 API(분기)
    bps            numeric(14,2),                             -- BPS (원)       — 재무비율 API(분기)
    debt_ratio     numeric(8,2),                              -- 부채비율 (%)   — 금융위/재무비율
    source         varchar(10) not null,                      -- 'master' | 'kis_api' | 'fsc'
    updated_at     timestamptz not null default now(),
    primary key (stock_code, base_ym)
);

comment on table stock_financials is '재무지표 (연간: 마스터 파일 / 분기: KIS 재무비율 API)';

-- ─────────────────────────────────────────────
-- 3) 인트라데이 시세: 1시간 단위 (모의투자 기준가) — 7일 보관
-- ─────────────────────────────────────────────
create table if not exists stock_price_snapshot (
    id                  bigint generated always as identity primary key,
    stock_code          varchar(6)  not null references stock(stock_code),
    snapshot_at         timestamptz not null,                 -- 적재 시각 (수집 시점)
    current_price       integer     not null,                 -- 현재가 (원)
    prev_day_diff       integer,                              -- 전일대비 (원)
    prev_day_sign       varchar(1),                           -- 전일대비부호 (1상한 2상승 3보합 4하락 5하한)
    change_rate         numeric(7,2),                         -- 등락률 (%)
    open_price          integer,                              -- 시가
    high_price          integer,                              -- 고가
    low_price           integer,                              -- 저가
    accum_volume        bigint,                               -- 누적거래량 (주)
    accum_trade_amount  bigint,                               -- 누적거래대금 (원)
    market_cap_eokwon   bigint,                               -- 시가총액 (억원)
    created_at          timestamptz not null default now(),
    unique (stock_code, snapshot_at)
);

comment on table stock_price_snapshot is '1시간 단위 인트라데이 시세 (모의투자 기준가). 7일 경과분은 정리 배치로 삭제.';

create index if not exists idx_snapshot_stock_time
    on stock_price_snapshot (stock_code, snapshot_at desc);
create index if not exists idx_snapshot_time
    on stock_price_snapshot (snapshot_at);

-- 정리 배치(매일 새벽)에서 실행:
--   delete from stock_price_snapshot where snapshot_at < now() - interval '7 days';

-- ─────────────────────────────────────────────
-- 4) 일봉: 종가 OHLC + 가치지표 (마감 1회 적재) — 장기 보관
--    저평가 스크리너 / 랭킹 히스토리 / 과거 차트 근거
-- ─────────────────────────────────────────────
create table if not exists stock_daily (
    stock_code        varchar(6)  not null references stock(stock_code),
    base_date         date        not null,                   -- 기준일
    -- 시세
    close_price       integer,                                -- 종가
    open_price        integer,                                -- 시가
    high_price        integer,                                -- 고가
    low_price         integer,                                -- 저가
    volume            bigint,                                 -- 거래량 (주)
    trade_amount      bigint,                                 -- 거래대금 (원)
    market_cap_eokwon bigint,                                 -- 시가총액 (억원)
    -- 가치지표
    per               numeric(12,2),                          -- PER
    pbr               numeric(12,2),                          -- PBR
    eps               numeric(14,2),                          -- EPS (원)
    bps               numeric(14,2),                          -- BPS (원)
    w52_high          integer,                                -- 52주 최고가
    w52_low           integer,                                -- 52주 최저가
    created_at        timestamptz not null default now(),
    primary key (stock_code, base_date)
);

comment on table stock_daily is '일봉: 종가 OHLC + 가치지표 (마감 후 1회 적재, 장기 보관) — 스크리너/랭킹 근거';

create index if not exists idx_daily_date on stock_daily (base_date);

-- ─────────────────────────────────────────────
-- 5) 저평가 점수/랭킹 히스토리 (스키마만 — 적재는 가중치 확정 후)
-- ─────────────────────────────────────────────
create table if not exists undervalue_score (
    base_date    date        not null,                        -- 산출 기준일
    stock_code   varchar(6)  not null references stock(stock_code),
    total_score  numeric(6,2),                                -- 종합 저평가 점수
    rank         integer,                                     -- 당일 순위
    per_score       numeric(6,2),                             -- 세부: PER 기여 점수 (0~100)
    pbr_score       numeric(6,2),                             -- 세부: PBR 기여 점수 (0~100)
    ev_ebitda_score numeric(6,2),                             -- 세부: EV/EBITDA 기여 점수 (0~100)
    growth_score    numeric(6,2),                             -- 세부: 성장률 기여 점수 (0~100)
    per             numeric(12,2),                            -- PER 원값 (시총/순이익) — 스크리너 표시/필터
    pbr             numeric(12,2),                            -- PBR 원값 (시총/순자본) — 스크리너 표시/필터
    created_at   timestamptz not null default now(),
    primary key (base_date, stock_code)
);

comment on table undervalue_score is '저평가 점수/랭킹 히스토리. 점수 = PER30% + PBR30% + EV/EBITDA25% + 성장률15% (기능정의서 v1.2). undervalueScoreJob(1시간 주기) 적재.';

create index if not exists idx_uvscore_date_rank on undervalue_score (base_date, rank);

-- ─────────────────────────────────────────────
-- 6) 회원 (Spring Security 세션 인증)
-- ─────────────────────────────────────────────
create table if not exists member (
    id          bigint generated always as identity primary key,
    username    varchar(30)  not null unique,         -- 닉네임 (로그인 ID)
    password    varchar(100) not null,                -- BCrypt 해시
    avatar      varchar(8),                            -- 이모지 아바타
    created_at  timestamptz  not null default now()
);

comment on table member is '회원 (Spring Security 세션 인증). password 는 BCrypt 해시.';

-- ─────────────────────────────────────────────
-- 7) 모의투자 대결 (Phase 1: 국내 종목만)
-- ─────────────────────────────────────────────
create table if not exists battle_room (
    id             bigint generated always as identity primary key,
    name           varchar(100) not null,
    host_member_id bigint not null references member(id),
    invite_code    varchar(12) not null unique,
    period_days    smallint not null,
    start_points   bigint not null,
    max_players    smallint not null,
    market         varchar(4) not null check (market in ('both','kr','us')),
    status         varchar(8) not null default 'waiting' check (status in ('waiting','active','finished')),
    starts_at      timestamptz,
    ends_at        timestamptz,
    created_at     timestamptz not null default now()
);

comment on table battle_room is '모의투자 대결방 (Phase 1: 국내 종목만, 1시간 적재가 기준)';

create table if not exists battle_participant (
    id        bigint generated always as identity primary key,
    room_id   bigint not null references battle_room(id),
    member_id bigint not null references member(id),
    points    bigint not null default 0,
    joined_at timestamptz not null default now(),
    unique (room_id, member_id)
);

comment on table battle_participant is '대결 참가자 (현금 잔고. 시작 전 0, 시작 시 start_points 지급)';

create table if not exists battle_holding (
    id             bigint generated always as identity primary key,
    participant_id bigint not null references battle_participant(id),
    stock_code     varchar(6) not null references stock(stock_code),
    qty            integer not null default 0,
    avg_price      integer not null default 0
);

comment on table battle_holding is '대결 참가자 보유 종목 (평단가)';

create table if not exists battle_trade (
    id             bigint generated always as identity primary key,
    participant_id bigint not null references battle_participant(id),
    stock_code     varchar(6) not null,
    type           varchar(4) not null check (type in ('buy','sell')),
    qty            integer not null,
    price          integer not null,
    traded_at      timestamptz not null default now()
);

comment on table battle_trade is '대결 거래 내역 (시장가, 1시간 적재가 기준)';

create index if not exists idx_battle_participant_room on battle_participant (room_id);
create index if not exists idx_battle_holding_participant on battle_holding (participant_id);
create index if not exists idx_battle_trade_participant on battle_trade (participant_id);

-- ─────────────────────────────────────────────
-- 8) 관심종목 (watchlist)
-- ─────────────────────────────────────────────
create table if not exists watchlist (
                                         member_id  bigint     not null references member(id) on delete cascade,
    stock_code varchar(6) not null references stock(stock_code) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (member_id, stock_code)
    );

comment on table watchlist is '회원별 관심종목. (member_id, stock_code) 복합 PK — 중복 불가.';

-- ─────────────────────────────────────────────
-- 9) 소셜 계정 연동 (카카오 등)
-- ─────────────────────────────────────────────
create table if not exists social_account (
                                              id          bigint generated always as identity primary key,
                                              member_id   bigint      not null references member(id) on delete cascade,
    provider    varchar(20)  not null,   -- 'kakao', 'naver', 'google' 등
    provider_id varchar(100) not null,   -- 각 provider 의 사용자 ID
    created_at  timestamptz  not null default now(),
    unique (provider, provider_id)
    );

comment on table social_account is '소셜 로그인 연동 (카카오 등). provider+provider_id 유니크.';
