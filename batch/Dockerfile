# syntax=docker/dockerfile:1
# 배치 앱(비웹). 상주 스케줄러로 KIS 시세/마스터/재무를 시간대별 자동 적재.
# backend/Dockerfile 과 동일한 2-스테이지 빌드(차이: 서버 미기동이라 EXPOSE 없음).

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

# ── 실행: JRE 21 (비웹 — 서버 안 띄우고 스케줄러로 상주) ──────
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
