import { parseDdlColumns, parseDdlTableName } from './ddlParser';

const USER_CUSTOMERS_DDL = `
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
`;

describe('ddlParser', () => {
  test('extracts table name from DDL', () => {
    expect(parseDdlTableName(USER_CUSTOMERS_DDL)).toBe('public.customers');
  });

  test('parses all 30 columns from PostgreSQL customers DDL', () => {
    const cols = parseDdlColumns(USER_CUSTOMERS_DDL);
    expect(cols).toHaveLength(30);

    const custId = cols.find((c) => c.name === 'customer_id');
    expect(custId).toBeDefined();
    expect(custId.type).toBe('BIGINT');
    expect(custId.nullable).toBe(false);
    expect(custId.primaryKey).toBe(true);

    const signupTs = cols.find((c) => c.name === 'signup_ts');
    expect(signupTs).toBeDefined();
    expect(signupTs.type).toBe('TIMESTAMP WITH TIME ZONE');
    expect(signupTs.nullable).toBe(false);

    const creditLimit = cols.find((c) => c.name === 'credit_limit');
    expect(creditLimit).toBeDefined();
    expect(creditLimit.type).toBe('NUMERIC(12,2)');
    expect(creditLimit.nullable).toBe(true);

    const marketing = cols.find((c) => c.name === 'marketing_opt_in');
    expect(marketing).toBeDefined();
    expect(marketing.type).toBe('BOOLEAN');
    expect(marketing.nullable).toBe(false);
  });

  test('handles inline PRIMARY KEY and simple DDL', () => {
    const ddl = 'CREATE TABLE orders (id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);';
    const cols = parseDdlColumns(ddl);
    expect(cols).toHaveLength(2);
    expect(cols[0].name).toBe('id');
    expect(cols[0].primaryKey).toBe(true);
    expect(cols[1].name).toBe('name');
    expect(cols[1].nullable).toBe(false);
  });
});
