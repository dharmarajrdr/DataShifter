package com.datashifter.fixtures;

public final class UnannotatedFunctions {
    private UnannotatedFunctions() {}

    public static boolean isEligible(Integer age) {
        return age != null && age >= 18;
    }
}