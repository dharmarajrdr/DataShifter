package com.datashifter.fixtures;

import com.datashifter.udf.sdk.DataShifterUdf;
import com.datashifter.udf.sdk.Row;

public class CustomerFunctions {

    public CustomerFunctions() {}

    @DataShifterUdf(name = "age-eligibility", description = "Returns true when the customer is at least 18")
    public boolean isEligible(Row row) {
        Integer age = row.get("age", Integer.class);
        return age != null && age >= 18;
    }

    @DataShifterUdf(name = "normalize-email", description = "Trims and lowercases an email address")
    public String normalizeEmail(Row row) {
        String email = row.get("email", String.class);
        return email == null ? null : email.trim().toLowerCase();
    }

    public static String internalHelper(String value) {
        return value;
    }
}