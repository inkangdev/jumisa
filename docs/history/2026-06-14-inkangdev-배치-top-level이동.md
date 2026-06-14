# 2026-06-14 · batch 를 top-level 독립 프로젝트로 이동

브랜치: `refactor/batch-top-level` (main 기준)

직전엔 batch 를 `backend/` 하위 Gradle 서브모듈(`backend/app` + `backend/batch`)로 뒀는데, 모노레포로는 **top-level 형제**가 더 명확하다는 판단으로 재배치.

## Before → After

```
# Before (backend 하위 멀티모듈)
backend/{app, batch}

# After (top-level 형제)
jumisa/
├─ backend/   웹앱 (단일 모듈, Render 배포)  ← backend/app 을 backend 로 환원
├─ batch/     배치 (독립 Gradle 프로젝트, 로컬 전용)
├─ frontend/
└─ docs/
```

## 한 일

- `backend/batch` → **`batch/`** (top-level). 자체 `settings.gradle.kts`·`build.gradle.kts`(플러그인 버전 인라인)·`gradlew`/`gradle/wrapper` 부여 → 독립 실행.
- `backend/app/src` → **`backend/src`** 로 환원, `backend/build.gradle.kts` 를 단일 모듈 웹 빌드로 복귀, `settings.gradle.kts` 의 `include` 제거.
- 레이어 패키지(controller/service/repository/dto/config)는 유지.
- **`.env` 를 리포지토리 루트로 이동**(`backend/.env` → `jumisa/.env`). backend·batch 가 공유. 각 `bootRun` 의 `workingDir = rootProject.projectDir.parentFile`(루트)로 설정해 양쪽이 루트 `.env` 를 읽음. `.env.example` 도 루트로.
- **`backend/Dockerfile`**: 단일 모듈 `bootJar` 빌드로 복귀(`/workspace/build/libs/*.jar`). `render.yaml`(dockerContext=backend) 그대로 동작.

## 검증 (로컬 JDK21)

- `backend`: `clean bootJar` → **BUILD SUCCESSFUL**, `backend-0.0.1-SNAPSHOT.jar` 단일 산출.
- `batch`: `compileKotlin` → **BUILD SUCCESSFUL** (독립 프로젝트).
- `backend bootRun` → 루트 `.env` 읽고 **HikariPool 연결 성공**, `/actuator/health` UP, `/api/auth/me` 403, 잘못된 로그인 401(+에러 메시지). 런타임 정상.
- (참고) 기동 직후 첫 health 는 Hikari lazy 연결 + Supabase 풀러 콜드로 잠깐 DOWN → 연결 후 UP.

## 배치 실행 (변경됨)

```
cd batch
./gradlew bootRun --args='master'   # 종목 마스터 적재
./gradlew bootRun --args='price'    # 시세 스냅샷 적재
```
