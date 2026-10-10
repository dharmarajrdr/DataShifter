package com.datashifter.pipeline.statemachine;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.exceptions.InvalidStateException;

import java.util.*;

/**
 * Pipeline State Machine:
 *
 *   NOT_VALIDATED ──→ VALIDATED | INVALID
 *   INVALID ────────→ VALIDATED | INVALID | NOT_VALIDATED
 *   VALIDATED ──────→ RUNNING | NOT_VALIDATED | INVALID
 *   RUNNING ────────→ PAUSED | COMPLETED | ERRORED
 *   PAUSED ─────────→ RUNNING | ERRORED
 *   ERRORED ────────→ RUNNING | NOT_VALIDATED
 *   COMPLETED ──────→ RUNNING | NOT_VALIDATED
 *
 * Any state ────────→ NOT_VALIDATED (reset)
 */
public final class PipelineStateMachine {

    private static final Map<PipelineStatus, Set<PipelineStatus>> TRANSITIONS = new EnumMap<>(PipelineStatus.class);

    static {
        TRANSITIONS.put(PipelineStatus.DRAFT,         EnumSet.of(PipelineStatus.NOT_VALIDATED, PipelineStatus.VALIDATED, PipelineStatus.INVALID));
        TRANSITIONS.put(PipelineStatus.NOT_VALIDATED, EnumSet.of(PipelineStatus.VALIDATED, PipelineStatus.INVALID));
        TRANSITIONS.put(PipelineStatus.INVALID,       EnumSet.of(PipelineStatus.VALIDATED, PipelineStatus.INVALID, PipelineStatus.NOT_VALIDATED));
        TRANSITIONS.put(PipelineStatus.VALIDATED,     EnumSet.of(PipelineStatus.VALIDATED, PipelineStatus.RUNNING, PipelineStatus.NOT_VALIDATED, PipelineStatus.INVALID));
        TRANSITIONS.put(PipelineStatus.RUNNING,       EnumSet.of(PipelineStatus.PAUSED, PipelineStatus.COMPLETED, PipelineStatus.ERRORED));
        TRANSITIONS.put(PipelineStatus.PAUSED,        EnumSet.of(PipelineStatus.RUNNING, PipelineStatus.ERRORED));
        TRANSITIONS.put(PipelineStatus.ERRORED,       EnumSet.of(PipelineStatus.RUNNING, PipelineStatus.NOT_VALIDATED));
        TRANSITIONS.put(PipelineStatus.COMPLETED,     EnumSet.of(PipelineStatus.RUNNING, PipelineStatus.NOT_VALIDATED));
    }

    private PipelineStateMachine() {}

    public static boolean canTransition(PipelineStatus from, PipelineStatus to) {
        if (from == to) return true; // idempotent self-transition
        if (to == PipelineStatus.NOT_VALIDATED || to == PipelineStatus.DRAFT) return true; // reset always allowed
        Set<PipelineStatus> allowed = TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    public static void validateTransition(PipelineStatus from, PipelineStatus to) {
        if (!canTransition(from, to)) {
            throw new InvalidStateException(from, to);
        }
    }

    public static Set<PipelineStatus> getAllowedTransitions(PipelineStatus current) {
        Set<PipelineStatus> result = new HashSet<>(TRANSITIONS.getOrDefault(current, EnumSet.noneOf(PipelineStatus.class)));
        result.add(PipelineStatus.NOT_VALIDATED);
        result.add(PipelineStatus.DRAFT);
        return result;
    }
}
