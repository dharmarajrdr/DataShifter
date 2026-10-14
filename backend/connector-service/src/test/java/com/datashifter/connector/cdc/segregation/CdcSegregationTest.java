package com.datashifter.connector.cdc.segregation;

import com.datashifter.common.cdc.CdcEvent;
import com.datashifter.common.cdc.CdcPosition;
import com.datashifter.common.enums.CdcOperationType;
import com.datashifter.common.enums.FilterOperator;
import com.datashifter.common.enums.LogicalOperator;
import com.datashifter.common.enums.TransformFunction;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class CdcSegregationTest {

    @Test
    @DisplayName("CdcTableFilter: schema-qualified, simple name, and case-insensitivity")
    void testTableFilterMatching() {
        CdcTableFilter filter = CdcTableFilter.of("HR.EMPLOYEES", "DEPARTMENTS", "ORDERS");

        assertTrue(filter.matches("HR", "EMPLOYEES"));
        assertTrue(filter.matches("hr", "employees"));
        assertTrue(filter.matches("HR", "employees"));
        assertTrue(filter.matches("PUBLIC", "DEPARTMENTS"));
        assertTrue(filter.matches("departments"));
        assertTrue(filter.matches("HR.EMPLOYEES"));
        assertTrue(filter.matches("ORDERS"));

        assertFalse(filter.matches("HR", "SALARIES"));
        assertFalse(filter.matches("CUSTOMERS"));
        assertFalse(filter.matches(""));
        assertFalse(filter.matches(null));

        // Allow-all filter
        CdcTableFilter allFilter = CdcTableFilter.allowAll();
        assertTrue(allFilter.matches("HR", "ANY_TABLE"));
        assertTrue(allFilter.matches("CUSTOMERS"));
    }

    @Test
    @DisplayName("CdcOperationFilter: allows configured ops, always allows commit/begin")
    void testOperationFilter() {
        CdcOperationFilter filter = CdcOperationFilter.of(CdcOperationType.INSERT, CdcOperationType.UPDATE);

        assertTrue(filter.matches(CdcOperationType.INSERT));
        assertTrue(filter.matches(CdcOperationType.UPDATE));
        assertFalse(filter.matches(CdcOperationType.DELETE));
        assertFalse(filter.matches(CdcOperationType.TRUNCATE));

        // Boundaries always pass
        assertTrue(filter.matches(CdcOperationType.COMMIT));
        assertTrue(filter.matches(CdcOperationType.BEGIN));
    }

    @Test
    @DisplayName("CdcRowFilter: numeric comparisons, LIKE, IN, NOT_NULL, AND/OR logic")
    void testRowFilter() {
        List<CdcRowFilterCriterion> criteria = List.of(
                CdcRowFilterCriterion.builder()
                        .columnName("STATUS")
                        .operator(FilterOperator.EQUALS)
                        .value("ACTIVE")
                        .logicalOperator(LogicalOperator.AND)
                        .build(),
                CdcRowFilterCriterion.builder()
                        .columnName("SALARY")
                        .operator(FilterOperator.GREATER_THAN_OR_EQUAL)
                        .value("50000")
                        .logicalOperator(LogicalOperator.AND)
                        .build(),
                CdcRowFilterCriterion.builder()
                        .columnName("EMAIL")
                        .operator(FilterOperator.LIKE)
                        .value("%@company.com")
                        .build()
        );

        CdcRowFilter rowFilter = CdcRowFilter.of(criteria);

        // Record matching all criteria
        Map<String, Object> matchingRow = Map.of(
                "STATUS", "ACTIVE",
                "SALARY", "65000",
                "EMAIL", "alice@company.com"
        );
        assertTrue(rowFilter.evaluate(matchingRow));

        // Low salary -> fail
        Map<String, Object> lowSalary = Map.of(
                "STATUS", "ACTIVE",
                "SALARY", "45000",
                "EMAIL", "bob@company.com"
        );
        assertFalse(rowFilter.evaluate(lowSalary));

        // Inactive status -> fail
        Map<String, Object> inactive = Map.of(
                "STATUS", "SUSPENDED",
                "SALARY", "70000",
                "EMAIL", "charlie@company.com"
        );
        assertFalse(rowFilter.evaluate(inactive));

        // Wrong email domain -> fail
        Map<String, Object> wrongEmail = Map.of(
                "STATUS", "ACTIVE",
                "SALARY", "60000",
                "EMAIL", "dave@other.org"
        );
        assertFalse(rowFilter.evaluate(wrongEmail));
    }

    @Test
    @DisplayName("CdcColumnTransformation: string, numeric, default value, and custom UDF")
    void testColumnTransformations() {
        // 1. String UPPER + APPEND
        CdcColumnTransformation nameTransform = CdcColumnTransformation.builder()
                .sourceColumn("first_name")
                .targetColumn("FIRST_NAME")
                .steps(List.of(
                        new CdcColumnTransformation.TransformStep(TransformFunction.UPPER, null),
                        new CdcColumnTransformation.TransformStep(TransformFunction.APPEND, "_EMP")
                ))
                .build();

        assertEquals("JOHN_EMP", nameTransform.apply("john", Map.of()));

        // 2. Numeric ROUND & ABS
        CdcColumnTransformation amountTransform = CdcColumnTransformation.builder()
                .sourceColumn("amount")
                .targetColumn("net_amount")
                .steps(List.of(
                        new CdcColumnTransformation.TransformStep(TransformFunction.ABS, null),
                        new CdcColumnTransformation.TransformStep(TransformFunction.ROUND, "2")
                ))
                .build();

        assertEquals(new BigDecimal("123.46"), amountTransform.apply("-123.456", Map.of()));

        // 3. Default if null
        CdcColumnTransformation defaultTransform = CdcColumnTransformation.builder()
                .sourceColumn("country")
                .targetColumn("country_code")
                .defaultValue("US")
                .build();

        assertEquals("US", defaultTransform.apply(null, Map.of()));
        assertEquals("CA", defaultTransform.apply("CA", Map.of()));

        // 4. Custom UDF with timeout protection
        CdcColumnTransformation udfTransform = CdcColumnTransformation.builder()
                .sourceColumn("phone")
                .targetColumn("masked_phone")
                .customUdf(val -> "***-***-" + val.toString().substring(val.toString().length() - 4))
                .build();

        assertEquals("***-***-1234", udfTransform.apply("555-867-1234", Map.of()));
    }

    @Test
    @DisplayName("CdcSegregationEngine: 100 tables in stream with only 3 configured")
    void testLargeScaleTableSegregation() {
        // Setup engine with 3 allowed tables out of 100
        CdcTableFilter tableFilter = CdcTableFilter.of("EMPLOYEES", "DEPARTMENTS", "PAYROLL");
        CdcOperationFilter opFilter = CdcOperationFilter.of(CdcOperationType.INSERT, CdcOperationType.UPDATE);

        CdcTableMappingConfig empConfig = CdcTableMappingConfig.builder()
                .sourceTable("EMPLOYEES")
                .targetTable("staff_members")
                .targetPrimaryKeyColumn("staff_id")
                .columnMappings(List.of(
                        CdcColumnTransformation.builder().sourceColumn("ID").targetColumn("staff_id").build(),
                        CdcColumnTransformation.builder().sourceColumn("NAME").targetColumn("full_name")
                                .steps(List.of(new CdcColumnTransformation.TransformStep(TransformFunction.UPPER, null)))
                                .build(),
                        CdcColumnTransformation.builder().sourceColumn("ROLE").targetColumn("designation")
                                .defaultValue("ASSOCIATE")
                                .build()
                ))
                .build();

        CdcSegregationEngine engine = new CdcSegregationEngine(tableFilter, opFilter, List.of(empConfig));

        // Generate 100 events across 100 tables (T001 to T100, including EMPLOYEES and DEPARTMENTS)
        List<CdcEvent> streamEvents = new ArrayList<>();
        for (int i = 1; i <= 100; i++) {
            String tableName = (i == 10) ? "EMPLOYEES" : ((i == 20) ? "DEPARTMENTS" : ("TABLE_" + i));
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("ID", 1000 + i);
            data.put("NAME", "User " + i);

            streamEvents.add(CdcEvent.builder()
                    .eventId("ev-" + i)
                    .schemaName("HR")
                    .tableName(tableName)
                    .operationType(CdcOperationType.INSERT)
                    .primaryKeyValues(Map.of("ID", 1000 + i))
                    .afterData(data)
                    .position(CdcPosition.builder().scn(50000L + i).build())
                    .build());
        }

        // Process batch through segregation engine
        List<CdcEvent> filtered = engine.processBatch(streamEvents);

        // Only EMPLOYEES and DEPARTMENTS should pass (2 out of 100)
        assertEquals(2, filtered.size());
        assertEquals(98, engine.getStats().getEventsFilteredByTable().get());
        assertEquals(2, engine.getStats().getEventsPassed().get());

        // Verify EMPLOYEES event was remapped to target table 'staff_members' and target column names
        CdcEvent empEvent = filtered.stream()
                .filter(e -> "staff_members".equals(e.getTableName()))
                .findFirst()
                .orElseThrow();

        assertEquals("USER 10", empEvent.getAfterData().get("full_name"));
        assertEquals("ASSOCIATE", empEvent.getAfterData().get("designation"));
        assertEquals(1010, empEvent.getPrimaryKeyValues().get("staff_id"));
    }

    @Test
    @DisplayName("CdcSegregationEngine: operation filtering and row filtering combined")
    void testOperationAndRowFilterCombined() {
        CdcTableFilter tableFilter = CdcTableFilter.of("ORDERS");
        // Only replicate INSERT and UPDATE, skip DELETE
        CdcOperationFilter opFilter = CdcOperationFilter.of(CdcOperationType.INSERT, CdcOperationType.UPDATE);

        CdcRowFilter rowFilter = CdcRowFilter.of(
                CdcRowFilterCriterion.builder()
                        .columnName("TOTAL")
                        .operator(FilterOperator.GREATER_THAN)
                        .value("100")
                        .build()
        );

        CdcTableMappingConfig ordersConfig = CdcTableMappingConfig.builder()
                .sourceTable("ORDERS")
                .rowFilter(rowFilter)
                .build();

        CdcSegregationEngine engine = new CdcSegregationEngine(tableFilter, opFilter, List.of(ordersConfig));

        CdcEvent insertSmall = CdcEvent.builder()
                .eventId("e1").tableName("ORDERS").operationType(CdcOperationType.INSERT)
                .afterData(Map.of("ORDER_ID", 1, "TOTAL", 50))
                .build();

        CdcEvent insertLarge = CdcEvent.builder()
                .eventId("e2").tableName("ORDERS").operationType(CdcOperationType.INSERT)
                .afterData(Map.of("ORDER_ID", 2, "TOTAL", 250))
                .build();

        CdcEvent deleteLarge = CdcEvent.builder()
                .eventId("e3").tableName("ORDERS").operationType(CdcOperationType.DELETE)
                .beforeData(Map.of("ORDER_ID", 3, "TOTAL", 300))
                .build();

        List<CdcEvent> results = engine.processBatch(List.of(insertSmall, insertLarge, deleteLarge));

        // Only insertLarge passes (insertSmall fails row filter, deleteLarge fails operation filter)
        assertEquals(1, results.size());
        assertEquals("e2", results.get(0).getEventId());

        assertEquals(1, engine.getStats().getEventsFilteredByRowFilter().get());
        assertEquals(1, engine.getStats().getEventsFilteredByOperation().get());
        assertEquals(1, engine.getStats().getEventsPassed().get());
    }
}
