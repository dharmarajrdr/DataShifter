package com.datashifter.udf.sdk;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class DirectRowTest {

    @Test
    void testDirectRowDelegationAndReset() {
        Map<String, Object> map = new HashMap<>();
        map.put("name", "Alice");
        map.put("age", 30);

        DirectRow row = new DirectRow();
        row.reset(map, "masked_name", "Pending");

        assertEquals("Alice", row.get("name"));
        assertEquals(30, row.get("age", Integer.class));
        assertTrue(row.has("name"));
        assertTrue(row.has("masked_name"));
        assertEquals("Pending", row.get("masked_name"));

        // Setting value in row mutates underlying map directly without copy
        row.set("masked_name", "A***e");
        assertEquals("A***e", row.get("masked_name"));
        assertEquals("A***e", map.get("masked_name"));

        // Reset with new record
        Map<String, Object> map2 = new HashMap<>();
        map2.put("name", "Bob");
        row.reset(map2, "masked_name", null);

        assertEquals("Bob", row.get("name"));
        assertNull(row.get("age"));
        assertFalse(row.has("age"));
    }
}
