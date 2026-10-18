package com.datashifter.adapter.sdk;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AdapterConfigTest {

    @Test
    void testTypedPropertiesAndDefaults() {
        Map<String, Object> props = new HashMap<>();
        props.put("host", "localhost");
        props.put("port", 5432);
        props.put("useSsl", "true");
        props.put("timeout", 30000L);

        AdapterConfig config = AdapterConfig.of(props);

        assertEquals("localhost", config.getString("host"));
        assertEquals("localhost", config.getString("host", "fallback"));
        assertEquals("default_val", config.getString("missing_key", "default_val"));

        assertEquals(5432, config.getInteger("port"));
        assertEquals(8080, config.getInteger("missing_port", 8080));

        assertTrue(config.getBoolean("useSsl"));
        assertFalse(config.getBoolean("missing_bool", false));

        assertEquals(30000L, config.getLong("timeout"));
        assertEquals(5000L, config.getLong("missing_timeout", 5000L));
    }
}
