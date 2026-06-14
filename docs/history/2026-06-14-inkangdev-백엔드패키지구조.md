# 2026-06-14 · 백엔드 패키지 구조 리팩터 (도메인 vs 인프라 분리)

브랜치: `refactor/backend-packages` (main 기준, 배틀 머지 이후)

기존 백엔드는 도메인(auth/stock)과 기술/인프라(kis/master/batch/config)가 한 레벨에 평면으로 섞여 "중구난방"이었다. 도메인 우선(package-by-feature) + 인프라/임시코드 분리로 정리.

## 결정

- **이미 깔끔한 도메인(auth/stock/battle)은 유지.** 어질러진 kis/master/batch/config/dev만 정리.
- `auth → member` 리네이밍, `global/security` 분리는 **보류**(import 변경 폭 대비 이득 적음). 후속 후보.

## Before → After

```
config/KisProperties              → infra/kis/KisProperties
kis/{KisClient,KisDtos,RateLimiter} → infra/kis/
kis/{DevKis,DevDb,DevBatch}Controller → dev/          (임시·제거예정 격리)
master/{KisMasterClient,StockMaster}  → stock/master/
batch/{StockMasterJobConfig,PriceSnapshotJobConfig} → stock/batch/
batch/BatchScheduler              → infra/batch/      (도메인 횡단 스케줄러)
```

결과 트리:

```
com.jumisa
├─ auth/            회원/인증 (유지)
├─ stock/           종목 도메인
│   ├─ master/      종목 마스터 소스
│   └─ batch/       종목 적재 배치 잡
├─ battle/          모의투자 대결 (유지)
├─ infra/           외부/기술 (도메인 아님)
│   ├─ kis/         한국투자증권 클라이언트 + 설정
│   └─ batch/       배치 스케줄러
└─ dev/             임시 디버그 컨트롤러
```

## 효과

- `config/` 제거, `kis/` 과적 해소(외부 클라이언트 ↔ 임시 Dev 컨트롤러 분리).
- "시세 적재" 기능이 `stock/`(master+batch) 아래로 모여 추적 쉬움.
- 도메인 ↔ 인프라 경계가 패키지로 드러남. 팀이 도메인별로 나눠 작업 시 충돌 감소.

## 변경 메커니즘

- `git mv`로 이동(13파일 rename 인식) + package 선언/`import` 경로 일괄 갱신.
- 같은 패키지였던 Dev 컨트롤러 분리로 `DevKisController`에 `import infra.kis.KisClient` 추가.
- `KisClient`/`RateLimiter`의 같은-패키지 `KisProperties` 중복 import 제거.
- 스캔 영향 없음: `@SpringBootApplication`(com.jumisa)·`@ConfigurationPropertiesScan`이 모든 하위 패키지를 포함.

## 검증

- 로컬 `./gradlew compileKotlin -x test` → **BUILD SUCCESSFUL** (IntelliJ 번들 JDK21 사용).
- 런타임/빈 등록: 패키지가 모두 com.jumisa 하위라 컴포넌트 스캔·프로퍼티 바인딩 그대로. (배포 후 `/actuator/health` UP로 최종 확인 권장.)

## 후속

- (선택) `auth → member`, `global/security`(SecurityConfig 분리), 공통 예외처리(`global/web`) 도입.
