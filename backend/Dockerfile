# syntax=docker/dockerfile:1.7
FROM maven:3.9.6-eclipse-temurin-17 AS builder
WORKDIR /app
ARG SERVICE_NAME
COPY . .
RUN --mount=type=cache,id=datashifter-m2,target=/root/.m2 \
    mvn -pl ${SERVICE_NAME} -am clean package -DskipTests

FROM eclipse-temurin:17-jre
ARG SERVICE_NAME
WORKDIR /app
COPY --from=builder /app/${SERVICE_NAME}/target/${SERVICE_NAME}-*-exec.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
