package com.datashifter.pipeline.statemachine;

import com.datashifter.common.enums.PipelineStatus;
import com.datashifter.common.exceptions.InvalidStateException;

import java.util.*;

/**
 * Pipeline State Machine:
 *
 *   DRAFT ──────→ VALIDATED
 *   VALIDATED ───→ RUNNING
 *   RUNNING ─────→ PAUSED | COMPLETED | ERRORED
 *   PAUSED ──────→ RUNNING | ERRORED
 *   ERRORED ─────→ RUNNING (resume from checkpoint)
 *   COMPLETED ───→ RUNNING (re-run)
 *
 * Any state ────→ DRAFT (reset)
 */
public final class PipelineStateMachine {

    private static final Map<PipelineStatus, Set<PipelineStatus>> TRANSITIONS = new EnumMap<>(PipelineStatus.class);

    static {
        TRANSITIONS.put(PipelineStatus.DRAFT,     EnumSet.of(PipelineStatus.VALIDATED));
        TRANSITIONS.put(PipelineStatus.VALIDATED,  EnumSet.of(PipelineStatus.RUNNING));
        TRANSITIONS.put(PipelineStatus.RUNNING,    EnumSet.of(PipelineStatus.PAUSED, PipelineStatus.COMPLETED, PipelineStatus.ERRORED));
        TRANSITIONS.put(PipelineStatus.PAUSED,     EnumSet.of(PipelineStatus.RUNNING, PipelineStatus.ERRORED));
        TRANSITIONS.put(PipelineStatus.ERRORED,    EnumSet.of(PipelineStatus.RUNNING));
        TRANSITIONS.put(PipelineStatus.COMPLETED,  EnumSet.of(PipelineStatus.RUNNING));
    }

    private PipelineStateMachine() {}

    public static boolean canTransition(PipelineStatus from, PipelineStatus to) {
        if (to == PipelineStatus.DRAFT) return true; // reset always allowed
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
        result.add(PipelineStatus.DRAFT); // reset
        return result;
    }
}
