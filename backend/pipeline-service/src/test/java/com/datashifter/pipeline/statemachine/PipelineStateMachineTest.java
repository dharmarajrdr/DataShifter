package com.datashifter.pipeline.statemachine;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.exceptions.InvalidStateException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PipelineStateMachineTest {

    @Test
    void testNotValidatedTransitions() {
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.NOT_VALIDATED, PipelineStatus.VALIDATED));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.NOT_VALIDATED, PipelineStatus.INVALID));
        assertFalse(PipelineStateMachine.canTransition(PipelineStatus.NOT_VALIDATED, PipelineStatus.RUNNING));
        assertThrows(InvalidStateException.class, () ->
                PipelineStateMachine.validateTransition(PipelineStatus.NOT_VALIDATED, PipelineStatus.RUNNING));
    }

    @Test
    void testInvalidTransitions() {
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.INVALID, PipelineStatus.VALIDATED));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.INVALID, PipelineStatus.INVALID));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.INVALID, PipelineStatus.NOT_VALIDATED));
        assertFalse(PipelineStateMachine.canTransition(PipelineStatus.INVALID, PipelineStatus.RUNNING));
        assertThrows(InvalidStateException.class, () ->
                PipelineStateMachine.validateTransition(PipelineStatus.INVALID, PipelineStatus.RUNNING));
    }

    @Test
    void testValidatedTransitions() {
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.VALIDATED, PipelineStatus.VALIDATED));
        assertDoesNotThrow(() -> PipelineStateMachine.validateTransition(PipelineStatus.VALIDATED, PipelineStatus.VALIDATED));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.VALIDATED, PipelineStatus.RUNNING));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.VALIDATED, PipelineStatus.NOT_VALIDATED));
        assertTrue(PipelineStateMachine.canTransition(PipelineStatus.VALIDATED, PipelineStatus.INVALID));
    }

    @Test
    void testResetToNotValidatedAlwaysAllowed() {
        for (PipelineStatus status : PipelineStatus.values()) {
            assertTrue(PipelineStateMachine.canTransition(status, PipelineStatus.NOT_VALIDATED));
        }
    }
}

