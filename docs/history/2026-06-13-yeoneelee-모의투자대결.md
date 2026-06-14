# 모의투자 대결 (D) — 작업 지시서

- **작업자**: hyeyeon.lee
- **브랜치**: `feature/battle`
- **기준 문서**: `docs/기능정의서_v1.1.md` 5장 / `docs/작업슬러그_v1.1.md` D그룹
- **기준 시안**: `docs/design/remixed-13412f58.tsx`

## 목표

같은 시작 포인트로 출발해 기간 내 수익률로 순위를 겨루는 **모의투자 대결**의
백엔드 + 프론트 첫 동작 슬라이스를 만든다.

## 의존성 처리 방침 (중요)

로드맵상 D는 B(미국·환율), C(솔로 매매)에 의존한다. 첫 슬라이스에서는 의존을 끊기 위해:

- **국내(KR) 종목 거래만** 지원한다. 미국 종목·환율은 Phase 2로 미룬다.
  → `환율연동`(B) 불필요해짐.
- 대결 참가자별 포트폴리오/매매 로직을 **대결 도메인 안에 자체 구현**한다.
  독립 솔로투자 화면(C의 `거래화면`)은 별도 작업으로 분리.
  → C 선행 불필요해짐.
- 시세는 기존 `stock_price_snapshot`(1시간 적재가, 국내)을 그대로 사용한다.

## 범위

### 포함 (Phase 1)
- 대결방 생성 / 초대코드 입장 / 대기방 / 시작
- 대결 중 국내 종목 매수·매도 (시장가, 1시간 적재가 기준)
- 참가자별 현금·보유종목·평단·거래내역
- 순위 집계 (총자산 = 현금 + 보유평가액, 수익률 기준)
- 대결 화면 (로비 / 생성 / 대기 / 진행: 순위·내투자·거래 탭)

### 제외 (후속)
- 미국 종목 거래·환율 (Phase 2, B 완료 후)
- 시안의 봇 참가자(BOT_PLAYERS) — 실제 회원 멀티플레이로 대체
- 대결 종료 자동 정산 스케줄러 (Phase 2)

## DB 스키마 (`backend/db/schema.sql`에 추가)

> 규칙: `ddl-auto: none`. schema.sql에 추가 후 Supabase SQL 에디터에서 직접 적용.

- `battle_room` — id, name, host_member_id(FK member), invite_code(uniq),
  period_days, start_points, max_players, market('both'|'kr'|'us'),
  status('waiting'|'active'|'finished'), starts_at, ends_at, created_at
- `battle_participant` — id, room_id(FK), member_id(FK), points(현금),
  joined_at. uniq(room_id, member_id)
- `battle_holding` — id, participant_id(FK), stock_code(FK stock), qty, avg_price
- `battle_trade` — id, participant_id(FK), stock_code, type('buy'|'sell'),
  qty, price, traded_at

## 백엔드 (`com.jumisa.battle` 패키지 신규)

- 엔티티/리포지토리: 위 4테이블
- API (모두 세션 인증 필요, `SecurityConfig` `anyRequest().authenticated()` 적용)
  - `POST /api/battles` — 방 생성 (이름/기간/시작금/최대인원/시장)
  - `GET  /api/battles` — 참가 가능한 방 + 내 진행 중 대결 목록
  - `POST /api/battles/{id}/join` — 초대코드로 입장
  - `GET  /api/battles/{id}` — 방 상세 (참가자/상태)
  - `POST /api/battles/{id}/start` — 방장이 시작 (참가자 전원에 start_points 지급, status=active, ends_at 계산)
  - `POST /api/battles/{id}/trade` — 매수/매도 (시장가, 현재가는 `stock_price_snapshot` 최신값)
  - `GET  /api/battles/{id}/ranking` — 참가자별 총자산·수익률·순위
- 체결 로직: 매수 시 현금 차감·평단 재계산, 매도 시 현금 증가·수량 차감.
  포인트/수량 부족 검증. status='active'에서만 거래 허용.

## 프론트 (`frontend/src/screens/battle/`)

시안(`remixed-13412f58.tsx`)의 대결 컴포넌트를 실제 API에 연결:
- `BattleLobby` / `CreateRoom` / `RoomWaiting` / `ActiveBattle`(순위·내투자·거래 탭)
- `App.tsx`에 `battle` 화면 + 하단 네비 탭 추가 (현재는 로그인/회원가입만 존재)
- 시안의 목 데이터(ALL_STOCKS, BOT_PLAYERS) 제거 → API 연동

## 단계

1. 스키마 추가 + Supabase 적용
2. 백엔드 엔티티·리포지토리·방 생명주기 API (생성/목록/입장/상세/시작)
3. 백엔드 거래·순위 API
4. 프론트 화면 연동
5. 수동 검증 (회원 2명으로 방 생성→입장→시작→거래→순위)

## 진입 전 결정 필요 (미결)

- 대결 시세 갱신 기준: **1시간 적재가**로 진행 예정(`stock_price_snapshot`). 실시간 필요 시 재논의.
- 시작 후 시세 스냅샷이 없는 시간대(장외)의 현재가 처리 방식.
- 멀티플레이 동기화 방식(폴링 vs 실시간) — 우선 폴링으로 시작.