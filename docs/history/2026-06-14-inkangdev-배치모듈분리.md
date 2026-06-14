# 2026-06-14 · 백엔드 2모듈 분리(app/batch) + 패키지 레이어 우선

브랜치: `refactor/split-batch-module` (main 기준)

직전 "도메인 우선" 구조를 사용자 요청으로 재구성:
1. **배치를 별도 모듈로 분리** — 메모리 때문에 Render엔 안 올리고 로컬 전용.
2. **`dev` 디버그 컨트롤러 제거.**
3. **패키지 레이어 우선** — controller/service/repository/dto/config가 1depth.

## 핵심 근거

웹(auth/battle)과 배치는 코드를 거의 공유하지 않음(auth/battle은 stock·KIS 미참조, battle은 시세를 자체 JDBC로 읽음). → 공유 core 없이 **2모듈**로 깔끔히 분리.

## 구조

```
backend/  (멀티모듈: settings include app,batch)
├─ app/    ← Render 배포 (웹). web/security/jdbc/validation/actuator. batch·KIS·JPA 없음
│   com.jumisa: AppApplication / controller / service / repository / dto / config
├─ batch/  ← 로컬 전용 (비웹). batch/jdbc/spring-web(KIS RestClient)
│   com.jumisa: BatchApplication / runner / job / scheduler / repository / client / dto / config
```

- JPA 엔티티 없음 확인 → 두 모듈 `spring-boot-starter-jdbc`(Hibernate 제거, 메모리↓).
- app: `BackendApplication` → `AppApplication`(@SpringBootApplication).
- batch: `BatchApplication`(web-application-type=none, @ConfigurationPropertiesScan, @EnableScheduling).
- **배치 실행 = CLI**: 구 `DevBatchController`(HTTP) → `BatchCliRunner`(CommandLineRunner).
  - `./gradlew :batch:bootRun --args='master'` (종목 마스터) / `--args='price'` (시세 스냅샷)
- **삭제**: `DevKisController`, `DevDbController`, `DevBatchController`, 구 `BackendApplicationTests`.
- `application.yml` 분리: app(datasource/web/management) / batch(datasource/batch/KIS, web 없음).
- bootRun workingDir=루트 → backend/.env 공유.

## 빌드/배포

- 루트 `build.gradle.kts`: 플러그인 `apply false` + `allprojects` 공통(group/version/repo). 각 모듈이 플러그인·의존성 자체 선언.
- **`Dockerfile`**: `:app:bootJar`만 빌드, `/src/app/build/libs/*.jar` 복사. (batch는 빌드/배포 안 함. settings include 때문에 batch/build.gradle.kts만 복사, 소스는 불필요.)
- `render.yaml`: dockerContext=backend 유지(Dockerfile가 :app만 빌드 → 그대로 동작).

## 검증 (로컬 JDK21)

- `./gradlew :app:compileKotlin :batch:compileKotlin` → 둘 다 **BUILD SUCCESSFUL**.
- `./gradlew :app:bootJar` → `app-0.0.1-SNAPSHOT.jar` 단일 산출(plain jar 없음).
- `./gradlew :app:bootRun` 기동 → **`/actuator/health` UP**(Supabase 연결 정상), `/api/auth/me` 403, `/api/battles` 403, 잘못된 로그인 401 → 컨트롤러·시큐리티·DB조회 런타임 정상.
- 패키지 이동은 모두 com.jumisa 하위라 컴포넌트 스캔 영향 없음.

## 주의 / 후속

- app에서 spring-batch 제거 → BATCH_* 메타테이블 초기화는 batch 모듈만 수행(정상).
- 배치 실데이터 적재(시세)는 KIS 유량 고려해 로컬에서 별도 실행.
- 향후 스크리너가 stock 데이터를 읽으면 app에 read 리포지토리 추가(또는 그때 core 분리).
