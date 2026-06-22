# 대결 봇(컴퓨터 참가자) — 랜덤 봇 MVP

작업자: inkangdev / 2026-06-22
요건: `기능정의서_v1.4.md` §5.6 (대결 봇)

## 목적

대결방을 늘 3명으로만 하니 심심 → **자동 매매하는 컴퓨터 참가자("봇")** 추가. MVP는 **random 전략 1종**.
핵심 설계: 봇은 새 매매 엔진이 아니라 **기존 `BattleService.trade()` 를 스케줄이 대신 호출**하는 또 한 명의 참가자.

## 구현

### 데이터 (V2__battle_bot.sql)
- `member.is_bot`, `battle_participant.bot_strategy`/`bot_seed`(null=사람)
- `bot_run_log(room_id, snapshot_at)` — 스냅샷당 방별 1회 매매 보장(중복 실행 방지)

### 백엔드
- `MemberRepository.insertBot()` — 봇 회원 생성(noop 비번, is_bot=true, avatar 🤖)
- `BattleRepository` — `insertBotParticipant`, `findRoomsByStatus`, `findBotParticipants`, `latestSnapshotAt`, `tryMarkBotRun`
- `BattleService.createRoom` — `botCount` 받아 봇 member+participant 편성(random, 랜덤 이름 "랜덤이·A3F"). 봇 수 ≤ 최대인원-1. 시작 시 기존 루프가 봇에도 동일 시작 포인트 지급.
- `BattleBotService.runOnce()` — 활성 방 순회 → 봇별 전략 결정 → `trade()` 재호출. 신선도(90분)·시장(kr)·중복방지·**종료 처리(finished)** 포함.
- random 전략: 20% 쉼 / 보유 있으면 일부 매도 / 아니면 현금 10~25%로 무작위 매수. `seed xor snapshot` 으로 매시 다르되 봇 개성 유지.
- `BattleBotScheduler` — `@Scheduled(cron "0 5 9-15 * * MON-FRI")`, 장중 매시 시세 적재 직후 1회. `AppApplication`에 `@EnableScheduling`.
- `DevBotController` `POST /dev/bots/run` — 즉시 1회 수동 트리거(테스트/운영). `/dev`는 permitAll, bot_run_log 덕에 같은 스냅샷 반복호출 no-op.

### 프론트
- `CreateRoom.tsx` — "🤖 컴퓨터(봇) 추가" 스테퍼(0~최대인원-1), 미리보기 칩, createRoom에 botCount 전달
- `api/battle.ts` — createRoom body에 botCount

## 검증 (로컬, 맥북)
- 로컬 DB 볼륨 재생성 후 backend 기동 → **Flyway V1·V2 적용 성공**(history success), bot_run_log·bot 컬럼 생성.
- 활성 방+봇3+시세 시드 → `POST /dev/bots/run` → **봇 2건 매수 체결**(잔고 차감·보유 반영), 1봇은 스킵.
- 재호출 → `trades:0`(스냅샷당 1회 중복방지 확인).
- 만료 방 → 패스가 `status='finished'` 전환 확인.
- backend `compileKotlin` / 프론트 `tsc --noEmit` 통과.

> 주의: origin/main 머지 때 V1이 충돌해소로 바뀌어 로컬 DB의 V1 체크섬이 어긋남 → 로컬 볼륨 재생성으로 해결(운영/팀원 영향 없음, main의 V1은 안정). 앞으로 적용된 V1 수정 금지(규칙3).

## 다음(후속, MVP 범위 밖)
- value/momentum 전략, 난이도 노브
- 봇 거래 피드 엔드포인트 + 레이스 탭 노출, 종료화면 코멘트
- 봇의 메달/명예의 전당 자격(기능정의서 미결)
