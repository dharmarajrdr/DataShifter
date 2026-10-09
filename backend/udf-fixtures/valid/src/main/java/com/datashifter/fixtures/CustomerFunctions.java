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

    @DataShifterUdf(name = "to-zoho-account", description = "Converts an email to a Zoho account")
    public String toZohoAccount(Row row) {
        String email = row.get("email", String.class);
        if (email == null) return null;
        int atIndex = email.indexOf('@');
        if (atIndex == -1) return email; // Invalid email, return as is
        return email.substring(0, atIndex) + "@zoho.com";
    }

    public static String internalHelper(String value) {
        return value;
    }
}