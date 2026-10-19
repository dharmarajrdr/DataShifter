package com.datashifter.common.utils;

import com.datashifter.common.dtos.ConnectionDtos.ColumnMetadata;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DdlSchemaParserTest {

    private static final String USER_CUSTOMERS_DDL = """
            CREATE TABLE public.customers (
                customer_id        BIGINT NOT NULL DEFAULT nextval('customers_customer_id_seq'::regclass),
                customer_code      VARCHAR(20) NOT NULL,
                first_name         VARCHAR(50) NOT NULL,
                last_name          VARCHAR(50) NOT NULL,
                email              VARCHAR(100) NOT NULL,
                phone              VARCHAR(20),
                dob                DATE,
                gender             CHAR(1),
                status             VARCHAR(20) NOT NULL,
                signup_ts          TIMESTAMP WITH TIME ZONE NOT NULL,
                credit_limit       NUMERIC(12,2),
                loyalty_points     INTEGER NOT NULL DEFAULT 0,
                tax_id             VARCHAR(30),
                country_code       CHAR(2) NOT NULL,
                state_code         VARCHAR(10),
                city               VARCHAR(50),
                postal_code        VARCHAR(15),
                address_line1      VARCHAR(100),
                address_line2      VARCHAR(100),
                preferred_currency CHAR(3) NOT NULL,
                marketing_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
                source_system      VARCHAR(20) NOT NULL,
                created_by         VARCHAR(30) NOT NULL,
                created_at         TIMESTAMP WITH TIME ZONE NOT NULL,
                updated_at         TIMESTAMP WITH TIME ZONE,
                risk_score         NUMERIC(5,2),
                annual_income      NUMERIC(14,2),
                is_active          BOOLEAN NOT NULL DEFAULT TRUE,
                notes              TEXT,
                customer_type      VARCHAR(20) NOT NULL,

                CONSTRAINT customers_pkey PRIMARY KEY (customer_id),
                CONSTRAINT customers_customer_code_key UNIQUE (customer_code)
            );
            """;

    @Test
    void shouldExtractTableName() {
        assertThat(DdlSchemaParser.parseTableName(USER_CUSTOMERS_DDL)).isEqualTo("public.customers");
    }

    @Test
    void shouldParseAll30ColumnsFromCustomersDdl() {
        List<ColumnMetadata> cols = DdlSchemaParser.parseColumns(USER_CUSTOMERS_DDL);
        assertThat(cols).hasSize(30);

        ColumnMetadata custId = cols.stream().filter(c -> "customer_id".equals(c.getColumnName())).findFirst().orElseThrow();
        assertThat(custId.getDataType()).isEqualTo("BIGINT");
        assertThat(custId.isNullable()).isFalse();
        assertThat(custId.isPrimaryKey()).isTrue();

        ColumnMetadata signupTs = cols.stream().filter(c -> "signup_ts".equals(c.getColumnName())).findFirst().orElseThrow();
        assertThat(signupTs.getDataType()).isEqualTo("TIMESTAMP WITH TIME ZONE");
        assertThat(signupTs.isNullable()).isFalse();

        ColumnMetadata creditLimit = cols.stream().filter(c -> "credit_limit".equals(c.getColumnName())).findFirst().orElseThrow();
        assertThat(creditLimit.getDataType()).isEqualTo("NUMERIC(12,2)");
        assertThat(creditLimit.isNullable()).isTrue();
    }

    @Test
    void shouldHandleInlinePrimaryKeyAndSimpleDdl() {
        String ddl = "CREATE TABLE orders (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);";
        List<ColumnMetadata> cols = DdlSchemaParser.parseColumns(ddl);
        assertThat(cols).hasSize(2);
        assertThat(cols.get(0).getColumnName()).isEqualTo("id");
        assertThat(cols.get(0).isPrimaryKey()).isTrue();
        assertThat(cols.get(1).getColumnName()).isEqualTo("name");
        assertThat(cols.get(1).isNullable()).isFalse();
    }
}
