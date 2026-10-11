package com.datashifter.fixtures;

import com.datashifter.udf.sdk.DataShifterUdf;
import com.datashifter.udf.sdk.Row;

public class DateRelatedUdf {

    public DateRelatedUdf() {}
    
    @DataShifterUdf(name = "currency-to-number", description = "Converts a currency string to a number")
    public int currencyToNumber(Row row) {

        String currency = row.get("currency_code", String.class);
        
        switch (currency) {
            case "INR": {
                return 1;
            }
            case "USD": {
                return 2;
            }
            case "EUR": {
                return 3;
            }
            default: {
                return 0;
            }
        }
    }
}
