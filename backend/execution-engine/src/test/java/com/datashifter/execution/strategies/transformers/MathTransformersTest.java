package com.datashifter.execution.strategies.transformers;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MathTransformersTest {

    private final RoundTransformer round = new RoundTransformer();
    private final CeilTransformer ceil = new CeilTransformer();
    private final FloorTransformer floor = new FloorTransformer();
    private final AbsTransformer abs = new AbsTransformer();
    private final TruncTransformer trunc = new TruncTransformer();

    @Test
    void testRound() {
        assertEquals(4L, round.transform(3.6, null));
        assertEquals(3L, round.transform(3.4, null));
        assertEquals(3.56, (Double) round.transform(3.556, "2"), 0.0001);
        assertEquals(3.55, (Double) round.transform(3.554, "2"), 0.0001);
        assertEquals(40L, round.transform("42", "-1")); // scale -1 rounds to tens
        assertNull(round.transform(null, null));
    }

    @Test
    void testCeil() {
        assertEquals(4L, ceil.transform(3.1, null));
        assertEquals(4L, ceil.transform(3.9, null));
        assertEquals(-3L, ceil.transform(-3.9, null));
        assertEquals(5L, ceil.transform("4.2", null));
        assertNull(ceil.transform(null, null));
    }

    @Test
    void testFloor() {
        assertEquals(3L, floor.transform(3.9, null));
        assertEquals(3L, floor.transform(3.1, null));
        assertEquals(-4L, floor.transform(-3.1, null));
        assertEquals(4L, floor.transform("4.8", null));
        assertNull(floor.transform(null, null));
    }

    @Test
    void testAbs() {
        assertEquals(42L, abs.transform(-42, null));
        assertEquals(42L, abs.transform(42, null));
        assertEquals(3.14, (Double) abs.transform(-3.14, null), 0.0001);
        assertEquals(10L, abs.transform("-10", null));
        assertNull(abs.transform(null, null));
    }

    @Test
    void testTrunc() {
        assertEquals(3L, trunc.transform(3.99, null));
        assertEquals(-3L, trunc.transform(-3.99, null));
        assertEquals(3.14, (Double) trunc.transform(3.149, "2"), 0.0001);
        assertEquals(5L, trunc.transform("5.88", null));
        assertNull(trunc.transform(null, null));
    }
}
