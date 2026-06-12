# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# 의존성 캐시를 위해 pom.xml 먼저 복사
COPY pom.xml ./
COPY .mvn ./.mvn
COPY mvnw ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B || true

COPY src ./src
RUN ./mvnw package -B -DskipTests

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 파일 업로드 디렉토리
RUN mkdir -p /C/Temp/semiproject

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 9999

ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]