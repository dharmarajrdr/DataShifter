package com.datashifter.execution.strategies.transformers;

import com.datashifter.common.exceptions.DatashifterException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

class TransformerImplementationsTest {

    @Test
    @DisplayName("TO_DATE: Converts Postgres INTEGER / LONG epoch seconds and milliseconds to java.sql.Timestamp")
    void testToDateFromIntegerAndLongEpoch() {
        ToDateTransformer toDate = new ToDateTransformer();

        // 1. Epoch seconds (10-digit Integer, e.g., 1712707200 = 2024-04-10T00:00:00Z)
        Object fromIntSec = toDate.transform(1712707200, "");
        assertInstanceOf(Timestamp.class, fromIntSec);
        assertEquals(1712707200L * 1000L, ((Timestamp) fromIntSec).getTime());

        // 2. Epoch milliseconds (13-digit Long)
        long epochMs = 1712707200000L;
        Object fromLongMs = toDate.transform(epochMs, null);
        assertInstanceOf(Timestamp.class, fromLongMs);
        assertEquals(epochMs, ((Timestamp) fromLongMs).getTime());

        // 3. Numeric string representing epoch seconds without format pattern
        Object fromNumStr = toDate.transform("1712707200", "");
        assertInstanceOf(Timestamp.class, fromNumStr);
        assertEquals(1712707200L * 1000L, ((Timestamp) fromNumStr).getTime());
    }

    @Test
    @DisplayName("TO_DATE: Converts yyyyMMdd integer and formatted strings to java.sql.Timestamp")
    void testToDateFromYyyyMmDdIntegerAndFormattedString() throws Exception {
        ToDateTransformer toDate = new ToDateTransformer();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        Date expected = sdf.parse("2026-04-10");

        // 1. 8-digit integer yyyyMMdd without pattern
        Object fromIntDate = toDate.transform(20260410, "");
        assertInstanceOf(Timestamp.class, fromIntDate);
        assertEquals(expected.getTime(), ((Timestamp) fromIntDate).getTime());

        // 2. 8-digit integer with explicit 'yyyyMMdd' pattern
        Object fromIntWithPattern = toDate.transform(20260410, "'yyyyMMdd'");
        assertInstanceOf(Timestamp.class, fromIntWithPattern);
        assertEquals(expected.getTime(), ((Timestamp) fromIntWithPattern).getTime());

        // 3. Standard date string '2026-04-10' with default pattern
        Object fromIsoStr = toDate.transform("2026-04-10", "");
        assertInstanceOf(Timestamp.class, fromIsoStr);
        assertEquals(expected.getTime(), ((Timestamp) fromIsoStr).getTime());

        // 4. Custom pattern 'dd/MM/yyyy'
        Object fromCustomStr = toDate.transform("10/04/2026", "'dd/MM/yyyy'");
        assertInstanceOf(Timestamp.class, fromCustomStr);
        assertEquals(expected.getTime(), ((Timestamp) fromCustomStr).getTime());

        // 5. Pass-through Date / Instant / LocalDate
        Instant now = Instant.now();
        Object fromInstant = toDate.transform(now, null);
        assertInstanceOf(Timestamp.class, fromInstant);
        assertEquals(now.toEpochMilli(), ((Timestamp) fromInstant).getTime());
    }

    @Test
    @DisplayName("TO_NUMBER: Converts String, Number, Boolean, and Date/Timestamp to numeric values")
    void testToNumberConversions() {
        ToNumberTransformer toNumber = new ToNumberTransformer();

        assertEquals(12345L, toNumber.transform("12345", null));
        assertEquals(45.67, toNumber.transform("45.67", null));
        assertEquals(99, toNumber.transform(99, null));
        assertEquals(1L, toNumber.transform(true, null));
        assertEquals(0L, toNumber.transform(false, null));
        assertEquals(1L, toNumber.transform("true", null));
        assertEquals(0L, toNumber.transform("false", null));

        Timestamp ts = new Timestamp(1712707200000L);
        assertEquals(1712707200000L, toNumber.transform(ts, null));
        assertNull(toNumber.transform(null, null));
        assertNull(toNumber.transform("   ", null));
    }

    @Test
    @DisplayName("TO_BOOLEAN: Converts strings and numbers to boolean")
    void testToBooleanConversions() {
        ToBooleanTransformer toBoolean = new ToBooleanTransformer();

        assertEquals(true, toBoolean.transform("true", null));
        assertEquals(true, toBoolean.transform("YES", null));
        assertEquals(true, toBoolean.transform("1", null));
        assertEquals(true, toBoolean.transform(1, null));
        assertEquals(false, toBoolean.transform("false", null));
        assertEquals(false, toBoolean.transform("no", null));
        assertEquals(false, toBoolean.transform("0", null));
        assertEquals(false, toBoolean.transform(0, null));
        assertNull(toBoolean.transform(null, null));
    }

    @Test
    @DisplayName("Text, Math, JSON, and System Value transformers work as expected")
    void testTextMathJsonAndSystemTransformers() {
        // Text
        assertEquals("hello", new TrimTransformer().transform("  hello  ", null));
        assertEquals("HELLO", new UpperTransformer().transform("hello", null));
        assertEquals("hello", new LowerTransformer().transform("HELLO", null));
        assertEquals("123", new ToStringTransformer().transform(123, null));
        assertEquals("hello_ext", new ConcatTransformer().transform("hello", "'_ext'"));
        assertEquals("pre_hello", new PrependTransformer().transform("hello", "'pre_'"));
        assertEquals("hel", new SubstringTransformer().transform("hello", "0,3"));
        assertEquals("hello", new SubstringTransformer().transform("hello", ""));

        // Math
        assertEquals(46L, new RoundTransformer().transform(45.67, "0"));
        assertEquals(45.7, new RoundTransformer().transform(45.67, "1"));
        assertEquals(46L, new CeilTransformer().transform(45.1, null));
        assertEquals(45L, new FloorTransformer().transform(45.9, null));
        assertEquals(42L, new AbsTransformer().transform(-42, null));
        assertEquals(45L, new TruncTransformer().transform(45.99, "0"));
        assertThrows(DatashifterException.class, () -> new RoundTransformer().transform("not-a-number", "0"));

        // JSON
        assertEquals("{\"name\":\"Alice\"}", new ToJsonTransformer().transform("Alice", "'name'"));
        assertEquals("[\"item1\"]", new ToJsonArrayTransformer().transform("item1", ""));
        assertEquals("{\"items\":[\"item1\"]}", new ToJsonArrayTransformer().transform("item1", "'items'"));

        // Null & System
        assertEquals("N/A", new DefaultIfNullTransformer().transform(null, "'N/A'"));
        assertEquals("val", new DefaultIfNullTransformer().transform("val", "'N/A'"));
        assertEquals("CONST", new StaticValueTransformer().transform("ignored", "'CONST'"));
        assertInstanceOf(Timestamp.class, new CurrentTimestampTransformer().transform(null, null));
        assertInstanceOf(java.sql.Date.class, new CurrentDateTransformer().transform(null, null));
        assertNotNull(new UuidTransformer().transform(null, null));
        assertEquals(1L, new RowNumberTransformer().transform(null, null));
    }
}

