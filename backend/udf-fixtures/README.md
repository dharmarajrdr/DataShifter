# UDF fixture JARs

These small projects create local test artifacts for the UDF upload and discovery flow.

Build the shared annotation first, then build both fixtures:

```bash
cd backend
mvn -pl datashifter-common install -DskipTests
mvn -f udf-fixtures/valid/pom.xml package
mvn -f udf-fixtures/invalid/pom.xml package
```

Artifacts are written to:

- `udf-fixtures/valid/target/datashifter-valid-udf-0.1.0.jar`
- `udf-fixtures/invalid/target/datashifter-invalid-udf-0.1.0.jar`

The valid JAR exposes two public annotated methods. The invalid JAR contains a compiled class but no public method annotated with `@DataShifterUdf` and should be rejected.