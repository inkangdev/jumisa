# 배치 baseDate KST 보정 — 일봉/지수 적재 날짜가 UTC로 박히던 버그

작업자: inkangdev / 2026-06-29

## 증상
대시보드 '주요 지수'가 비거나, 수동으로 지수 잡(`batch index`)을 돌리면 `base_date`가 **전날(주말 등)** 로 적재됨.

## 원인
컨테이너 TZ = **UTC**. 일봉(closingJob)·지수(marketIndexJob)의 `baseDate`를 `LocalDate.now()`(=UTC 날짜)로 만들고 있었음.
- 스케줄 실행은 15:30/15:35 KST(=06:30/06:35 UTC)라 UTC 날짜도 같은 날 → 우연히 정상.
- 그러나 **KST 오전(09시 이전) 수동 실행 시 UTC는 아직 전날** → `base_date`가 하루 전(주말이면 토/일)으로 박힘.

## 수정 (`LocalDate.now()` → `LocalDate.now(Asia/Seoul)`)
- `scheduler/BatchScheduler.kt` — `runClosing`, `runMarketIndex` 의 baseDate. (companion 에 `KST = ZoneId.of("Asia/Seoul")` 추가)
- `JobCliRunner.kt` — closing/marketIndex 수동 실행 시 baseDate.
- 그 외 `LocalDate.now()`(corpMapping/historyFill/finance)는 날짜 경계 영향이 미미해 범위 제외.

## 검증
- `docker compose build batch` 컴파일 통과.
- 배포 후 `batch index` 수동 실행 → `base_date`가 KST 당일로 적재되는지 확인 → 대시보드 주요 지수 표시.

## 비고
- 근본적으로는 컨테이너 TZ를 Asia/Seoul로 두는 방법도 있으나, 날짜 의존 지점만 명시적으로 KST 고정하는 게 더 안전(로그 UTC 유지).
- 지수 값은 KIS '현재지수' TR 기준이라, 장중 실행 시 실시간값 → 15:35 스케줄에서 종가로 upsert 갱신됨.
