package com.datashifter.fixtures;

import com.datashifter.common.udf.DataShifterUdf;

public final class CustomerFunctions {
    private CustomerFunctions() {}

    @DataShifterUdf(name = "age-eligibility", description = "Returns true when the customer is at least 18")
    public static boolean isEligible(Integer age) {
        return age != null && age >= 18;
    }

    @DataShifterUdf(name = "normalize-email", description = "Trims and lowercases an email address")
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public static String internalHelper(String value) {
        return value;
    }
}