# CLI 잡 러너 + 초기 데이터 적재 / 저평가 점수 첫 산출 — 2026-06-17 (inkangdev)

브랜치: `feat/batch-cli-runner` → PR

저평가 점수가 0건이던 원인 = 소스 데이터(stock/financials/snapshot) 미적재. 잡들이 스케줄(평일 08시 등) 전이라
한 번도 안 돈 상태였고 **즉시 실행 수단이 없었다**. CLI 러너를 추가하고 데이터를 채워 저평가 점수를 처음 산출.

## 추가/변경

```
batch/.../JobCliRunner.kt   ApplicationRunner — 비옵션 인자(master|price|finance|undervalue)로 해당 잡 1회 실행 후 종료.
                            인자 없으면 상주(스케줄러) 모드. docker compose run --rm -e BATCH_SCHEDULER_ENABLED=false batch <잡>
.env.example                KIS_RATE_PER_SECOND 18 → 15 (실전 20한도에 18은 유량초과(EGW) 다발 → 15로 안정)
```

## 초기 적재 결과 (KIS 실전 키)

| 잡 | 결과 | 소요 |
|---|---|---|
| master | stock 2,536건 (KOSPI 808 + KOSDAQ 1728), 거래가능 2,406 | ~0.5s |
| finance | 재무 4,620건 적재(실패 0), crno 2,536 전부 매핑 | 27분48초 |
| price | 시세 2,158건(시총 포함). rate 18→280건 유량초과 → **15로 재실행 시 1건**으로 격감 | 3분16초 |
| undervalue | **저평가 점수 2,314건 산출·랭킹** | 1초 |

## 메모 / 후속 보정 후보

- **rate 15 확정**: 실전 20한도에 18은 초과 발생(280건 스킵), 15는 거의 0. .env/secrets/.env.example 모두 15.
- **적자기업 점수 왜곡**: PER=시총/순이익, EV/EBITDA=(시총+총부채)/영업이익 은 순이익·영업이익 ≤0 이면 NULL →
  PBR+성장률만으로 정규화돼 상위권에 적자기업이 섞임. 보정안: (a) 4지표 모두 유효한 종목만 랭킹, (b) 결측 지표 페널티.
- 데이터는 일회성 CLI 로 적재했고, 이후엔 스케줄러가 자동 갱신(마스터 평일08시 / 시세 평일09~15시 5분 / 재무 일요일06시 / 저평가 매시 정각).
- price 유량초과로 일부 종목 시세 결측 가능 → 다음 시세 잡 사이클에 보완됨.
