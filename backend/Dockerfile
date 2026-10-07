FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app
# Copy all source code
COPY . .
# Build the multi-module project
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
ARG SERVICE_NAME
WORKDIR /app
COPY --from=builder /app/${SERVICE_NAME}/target/${SERVICE_NAME}-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
