# syntax=docker/dockerfile:1

# ── 빌드 스테이지: JDK 21 + Gradle 로 bootJar 생성 ──────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# 의존성 캐시를 위해 빌드 스크립트/래퍼 먼저 복사
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# 소스 복사 후 jar 빌드
# (테스트는 Supabase 연결이 필요하므로 이미지 빌드 단계에선 제외)
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── 실행 스테이지: JRE 21 ────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

# Render 가 주입하는 PORT 로 바인딩됨 (application.yml 의 server.port 참고)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
