# syntax=docker/dockerfile:1

# ── 빌드: JDK 21 로 bootJar 생성 ──────────────────────────────
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# 의존성 캐시를 위해 빌드 스크립트/래퍼 먼저 복사
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle
# CRLF 로 체크아웃돼도(윈도우 self-hosted 러너) 빌드가 깨지지 않게 줄바꿈 정규화
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true

# 소스 복사 후 bootJar (테스트는 DB 필요하므로 제외)
COPY src ./src
RUN ./gradlew --no-daemon clean bootJar -x test

# ── 실행: JRE 21 ────────────────────────────────────────────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar

# Render 가 주입하는 PORT 로 바인딩됨 (application.yml 의 server.port 참고)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
