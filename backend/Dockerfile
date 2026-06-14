# syntax=docker/dockerfile:1

# ── 빌드: JDK 21 로 :app(웹) bootJar 생성 ──────────────────────
# batch 모듈은 로컬 전용이라 빌드/배포하지 않는다(:app 만 빌드).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src

# 빌드 스크립트/래퍼 먼저 복사(의존성 캐시). settings 가 batch 도 include 하므로
# batch/build.gradle.kts 도 필요(소스는 불필요 — :app 만 컴파일).
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
COPY app/build.gradle.kts ./app/
COPY batch/build.gradle.kts ./batch/
RUN chmod +x gradlew && ./gradlew --no-daemon :app:dependencies > /dev/null 2>&1 || true

# 앱 소스 복사 후 bootJar (테스트는 DB 필요하므로 제외)
COPY app/src ./app/src
RUN ./gradlew --no-daemon :app:bootJar -x test

# ── 실행: JRE 21 ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/app/build/libs/*.jar app.jar

# Render 가 주입하는 PORT 로 바인딩됨 (application.yml 의 server.port 참고)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
