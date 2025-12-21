# Copilot / AI agent instructions for DWth-system

Purpose: quick, actionable guidance so an AI coding agent can be productive immediately.

1. Big picture

-   This repository is a small Spring Boot microservice workspace with two main modules:
    -   `GatewayMS` — API gateway and auth enforcement. Key classes: `GatewayMsApplication.java`, `filter/TokenFilter.java`.
    -   `UserMS` — user-facing microservice. Key packages: `api/` (REST controllers), `config/` (security/CORS), `service/`, `repository/`.
-   Services communicate over HTTP (internal REST). `GatewayMS` validates JWTs (see `TokenFilter`) and forwards requests to downstream services.

2. Where to look for examples and patterns

-   Authentication/filter example: `GatewayMS/src/main/java/com/dwth_system/GatewayMS/filter/TokenFilter.java`.
-   Security + CORS: `UserMS/src/main/java/com/dwth_system/user/config/SecurityConfig.java` and `CorsConfig.java`.
-   Controller pattern: `UserMS/src/main/java/com/dwth_system/user/api/UserAPI.java`.
-   Application entrypoints: `*/src/main/java/**/*Application.java` (use these when running locally or attaching debuggers).

3. Build / run / test (Windows-focused)

-   Build both modules from repo root using the Maven wrapper:
    -   `cd GatewayMS` then `mvnw.cmd -DskipTests clean package` or `mvnw.cmd spring-boot:run`
    -   `cd UserMS` then `mvnw.cmd -DskipTests clean package` or `mvnw.cmd spring-boot:run`
-   Run tests:
    -   `cd UserMS && mvnw.cmd test`
    -   `cd GatewayMS && mvnw.cmd test`
-   Debug run with remote debugger (example port 5005):
    -   `cd UserMS && mvnw.cmd spring-boot:run -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"`

4. Project-specific conventions

-   Module names are capitalized directories: `GatewayMS`, `UserMS` — treat each as an independent Spring Boot app.
-   Java packages follow `com.dwth_system.<module>`.
-   Configs live in `src/main/resources/application.properties` (module-specific). Prefer reading `target/classes/application.properties` only for runtime troubleshooting.
-   Tests live under `src/test/java` and use the standard Maven test lifecycle.

5. Integration points & external dependencies

-   External interaction is HTTP-based between services. Expect JWT tokens to be created/validated by the gateway.
-   Check `pom.xml` in each module for external libs; use the mvn wrapper when adding dependencies.

6. Change guidance for common tasks

-   Add a new REST endpoint: put controller in `UserMS/src/main/java/com/dwth_system/user/api/`, follow the structure in `UserAPI.java`.
-   Add cross-cutting auth logic: update `GatewayMS/filter/TokenFilter.java` and ensure `application.properties` in `GatewayMS` contains the expected keys.

7. Merging existing AI-instruction files

-   If a `.github/copilot-instructions.md` already exists in future, merge by preserving any project-specific examples and the build/run commands above.

8. Preferred assistant model (policy)

-   If you want guidance added for preferred models (example: "Claude Haiku 4.5 for all clients"), note: this file is advisory only — enabling a model globally must be done in the platform administration settings, not by editing repository files. If you confirm, we can add a single-line preference here.

If anything above is unclear or you want the file to favor a specific assistant/model, tell me and I'll update the file.
