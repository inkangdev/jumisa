# 대결 참가자 보유 종목 보기 (포트폴리오 엿보기)

작업자: inkangdev / 2026-06-23

## 목적

대결 순위 탭에서 **다른 참가자(봇 포함)의 보유 종목**을 볼 수 있게 한다.
공개 수위는 **전체 공개**(평단·개별손익까지, "내 투자" 탭과 동일)로 결정.
DB 변경 없는 **순수 조회** 기능 — 보유는 이미 `battle_holding`에 있음.

## 구현

### 백엔드 (스키마 변경 없음)
- `BattleService`
  - `getMyPortfolio` / 신규 `getParticipantPortfolio(viewerId, roomId, targetMemberId)` 가 공용 `portfolioOf(participant)` 재사용.
  - **인가**: 요청자가 그 방 참가자일 때만 허용(`findParticipant(roomId, viewerId) != null`). 아니면 "대결 참가자만 볼 수 있습니다".
  - 평단 0 가드 추가(0 나눗셈 방지).
- `BattleController` — `GET /api/battles/{id}/participants/{memberId}/portfolio`.

### 프론트
- `api/battle.ts` — `getParticipantPortfolio(id, memberId)`.
- `ActiveBattle.tsx`
  - `RankTab` — 행 탭 시 해당 참가자 포트폴리오 **지연 로드**(memberId별 캐시, openId 단일 펼침), 안내 문구.
  - `AnimatedRankRow` — 클릭 가능(▸/▾), 펼치면 아래 `HoldingsPanel`.
  - `HoldingsPanel` — 현금/주식평가 요약 + 보유 행(종목/수량/평단→현재/손익률/평가액). 로딩·에러·빈 보유 처리.
  - 봇 보유도 그대로 노출(🤖) — 봇 기능과 시너지(따라사기/역베팅).

## 검증 (로컬 e2e)
- 가입·로그인 → 봇2 방 생성·시작 → 신선 시세 주입 → `/dev/bots/run`(봇 매수) → 새 엔드포인트 호출.
- 봇 포트폴리오 정상 반환: 현금 858,000 + 삼성전자 2주(평단 71,000), 평단·손익 포함.
- 인가: 미인증 → **401**, 비참가 방 → **에러 메시지** 확인.
- backend `compileKotlin` / 프론트 `tsc --noEmit` 통과.

## 비고 / 후속
- 'waiting'(시작 전)엔 보유 없음 → active/finished에서 의미.
- 후속(범위 밖): 방 설정 "포트폴리오 공개 on/off" 토글, 펼침 시 실시간 갱신(현재는 탭 시점 캐시).
