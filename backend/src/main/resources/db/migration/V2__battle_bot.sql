-- ============================================================
-- V2 — 대결 봇(컴퓨터 참가자) MVP (기능정의서 v1.4 §5.6)
--   · member.is_bot            : 봇 회원 표시
--   · battle_participant.bot_* : 참가자 중 봇의 전략/시드 (null=사람)
--   · bot_run_log              : 스냅샷당 방별 1회 매매 보장(중복 실행 방지)
-- ============================================================

alter table member            add column if not exists is_bot boolean not null default false;
alter table battle_participant add column if not exists bot_strategy varchar(16);   -- null=사람, 'random'|'value'|'momentum'
alter table battle_participant add column if not exists bot_seed     bigint;        -- 봇별 난수 시드(개성·재현성)

comment on column member.is_bot                  is '봇(컴퓨터 참가자) 여부';
comment on column battle_participant.bot_strategy is '봇 전략(null=사람). MVP: random';

-- 봇 매매 패스가 같은 시세 스냅샷을 방마다 한 번만 처리하도록 하는 워터마크
create table if not exists bot_run_log (
    room_id     bigint      not null,
    snapshot_at timestamptz not null,
    ran_at      timestamptz not null default now(),
    primary key (room_id, snapshot_at)
);

comment on table bot_run_log is '대결 봇 매매 실행 기록 (room_id, snapshot_at) — 스냅샷당 방별 1회.';
