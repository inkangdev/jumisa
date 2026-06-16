# 저평가 점수 적재 Job (undervalueScoreJob, 1시간 주기) — 2026-06-17 (inkangdev)

브랜치: `feat/undervalue-score` → PR

기능정의서 v1.2 의 저평가 점수 공식을 산출/적재하는 **새 배치 잡**을 만든다(financeJob 과 분리, 1시간 주기).

`점수 = PER 30% + PBR 30% + EV/EBITDA 25% + 성장률 15%`

## 추가/변경 파일

```
batch/.../job/UndervalueScoreJobConfig.kt   undervalueScoreJob (Tasklet 단일 스텝)
batch/.../repository/UndervalueRepository.kt 점수 산출+적재 단일 SQL(window function)
batch/.../scheduler/BatchScheduler.kt        @Scheduled(cron "0 0 * * * *") 1시간 주기 등록 + Job 주입
backend/db/schema.sql                        undervalue_score 에 ev_ebitda_score·growth_score 컬럼 추가
```

## 지표 산출 (가용 데이터로 직접 계산)

`stock_financials` 의 eps/bps 는 financeJob 이 적재하지 않으므로(금융위 요약재무만), 시총·재무 원지표로 직접 계산:

| 지표 | 계산식 | 방향 |
|---|---|---|
| PER | 시총 / 순이익 | 낮을수록 저평가 |
| PBR | 시총 / 순자본(총자본) | 낮을수록 저평가 |
| EV/EBITDA | (시총 + 총부채) / 영업이익 | 낮을수록 저평가 (현금·감가상각 미반영 근사) |
| 성장률 | (당기매출 - 전기매출) / \|전기매출\| | 높을수록 좋음 |

- 시총 = `stock_price_snapshot` 최신(없으면 현재가 × 상장주식수), 재무 = `stock_financials` 최신 연간(source='fsc'), 성장률은 직전 연도 매출과 비교.
- 각 지표를 **거래가능 종목 백분위(0~100)** 로 점수화(PER/PBR/EV 낮을수록↑, 성장률 높을수록↑) → 가중합.
- **유효 지표만으로 가중치 정규화**(일부 지표 결측이어도 점수 산출). `total_score` 내림차순 `rank`.
- 기준일 = Asia/Seoul 오늘. 1시간마다 같은 날 재실행 시 upsert(갱신), 날짜 바뀌면 새 행(히스토리 누적).

## 설계 결정

- **단일 SQL(window function)** 로 전 종목 백분위·랭킹을 한 번에 산출/적재(Tasklet). chunk reader/processor 로는 전체 통계가 필요한 백분위 산출이 어려움.
- 새 잡으로 분리(financeJob 에 안 붙임) — 재무(주 1회)와 점수(1시간) 주기가 다름.

## 검증

- 산출 SQL 을 db 에 직접 실행 → `INSERT 0 0`(문법 정상, 현재 소스 데이터 0건이라 0행).
- batch 재빌드·기동 그린 — `undervalueScoreJob` 빈 등록 + 스케줄러 Job 주입 정상, `undervalue_score` 5개 점수 컬럼 확인.
- 실제 적재는 stock/stock_financials/snapshot 이 채워진 뒤 매시 정각 자동 실행(현재 db 비어 있어 0건).

## 메모

- 기존 pgdata 볼륨엔 schema.sql init 미적용 → 운영 db 에 `alter table undervalue_score add column if not exists ...` 로 컬럼 2개 직접 추가 완료.
- 자동배포(러너)로 main 머지 시 batch 재배포되어 잡 반영됨.
