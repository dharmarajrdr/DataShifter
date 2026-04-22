package com.datashifter.common.services;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Plan;
import com.datashifter.common.models.Subscription;
import com.datashifter.common.repositories.CommonSubscriptionRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Enforces subscription plan limits across all services.
 *
 * All limits come from the Plan table in the database — nothing is hardcoded.
 * To change limits, just UPDATE the plans table. No redeployment needed.
 *
 * Usage in any service:
 *   subscriptionLimitChecker.assertCanCreatePipeline(orgId, currentPipelineCount);
 *   subscriptionLimitChecker.assertCanCreateConnection(orgId, currentConnectionCount);
 *   subscriptionLimitChecker.assertCanAddMember(orgId, currentMemberCount);
 *   subscriptionLimitChecker.assertCanRunParallel(orgId, currentRunningCount);
 *   PlanLimits limits = subscriptionLimitChecker.getLimits(orgId);
 *
 * A limit of -1 means unlimited.
 * If no active subscription exists, Free tier limits apply (plan with displayOrder=0).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionLimitChecker {

    private final CommonSubscriptionRepository subscriptionRepository;

    @Transactional(readOnly = true)
    public PlanLimits getLimits(String orgId) {
        Optional<Subscription> sub = subscriptionRepository.findActiveWithPlan(orgId);
        if (sub.isEmpty()) {
            return PlanLimits.FREE_TIER;
        }
        Plan plan = sub.get().getPlan();
        return PlanLimits.builder()
                .planName(plan.getName())
                .maxPipelines(plan.getMaxPipelines() != null ? plan.getMaxPipelines() : -1)
                .maxConnections(plan.getMaxConnections() != null ? plan.getMaxConnections() : -1)
                .maxRowsPerMonth(plan.getMaxRowsPerMonth() != null ? plan.getMaxRowsPerMonth() : -1L)
                .maxMembers(plan.getMaxMembers() != null ? plan.getMaxMembers() : -1)
                .parallelPipelines(plan.getParallelPipelines() != null ? plan.getParallelPipelines() : -1)
                .active(true)
                .build();
    }

    @Transactional(readOnly = true)
    public void assertCanCreatePipeline(String orgId, long currentCount) {
        PlanLimits limits = getLimits(orgId);
        if (limits.getMaxPipelines() != -1 && currentCount >= limits.getMaxPipelines()) {
            throw new DatashifterException(String.format(
                    "Pipeline limit reached. Your %s plan allows %d pipelines. Upgrade to create more.",
                    limits.getPlanName(), limits.getMaxPipelines()));
        }
    }

    @Transactional(readOnly = true)
    public void assertCanCreateConnection(String orgId, long currentCount) {
        PlanLimits limits = getLimits(orgId);
        if (limits.getMaxConnections() != -1 && currentCount >= limits.getMaxConnections()) {
            throw new DatashifterException(String.format(
                    "Connection limit reached. Your %s plan allows %d connections. Upgrade to create more.",
                    limits.getPlanName(), limits.getMaxConnections()));
        }
    }

    @Transactional(readOnly = true)
    public void assertCanAddMember(String orgId, long currentCount) {
        PlanLimits limits = getLimits(orgId);
        if (limits.getMaxMembers() != -1 && currentCount >= limits.getMaxMembers()) {
            throw new DatashifterException(String.format(
                    "Member limit reached. Your %s plan allows %d members. Upgrade to add more.",
                    limits.getPlanName(), limits.getMaxMembers()));
        }
    }

    @Transactional(readOnly = true)
    public void assertCanRunParallel(String orgId, long currentRunningCount) {
        PlanLimits limits = getLimits(orgId);
        if (limits.getParallelPipelines() != -1 && currentRunningCount >= limits.getParallelPipelines()) {
            throw new DatashifterException(String.format(
                    "Parallel execution limit reached. Your %s plan allows %d concurrent pipelines. Wait for a running pipeline to finish or upgrade.",
                    limits.getPlanName(), limits.getParallelPipelines()));
        }
    }

    @Transactional(readOnly = true)
    public void assertRowsWithinLimit(String orgId, long rowsThisMonth) {
        PlanLimits limits = getLimits(orgId);
        if (limits.getMaxRowsPerMonth() != -1 && rowsThisMonth >= limits.getMaxRowsPerMonth()) {
            throw new DatashifterException(String.format(
                    "Monthly row limit reached. Your %s plan allows %s rows/month. Upgrade for higher limits.",
                    limits.getPlanName(), formatRows(limits.getMaxRowsPerMonth())));
        }
    }

    private String formatRows(long rows) {
        if (rows >= 1_000_000_000) return (rows / 1_000_000_000) + "B";
        if (rows >= 1_000_000) return (rows / 1_000_000) + "M";
        if (rows >= 1_000) return (rows / 1_000) + "K";
        return String.valueOf(rows);
    }

    @Getter
    @Builder
    public static class PlanLimits {
        private String planName;
        private int maxPipelines;
        private int maxConnections;
        private long maxRowsPerMonth;
        private int maxMembers;
        private int parallelPipelines;
        private boolean active;

        /** Default free tier limits — used when no subscription exists */
        public static final PlanLimits FREE_TIER = PlanLimits.builder()
                .planName("Free")
                .maxPipelines(2)
                .maxConnections(2)
                .maxRowsPerMonth(50_000L)
                .maxMembers(2)
                .parallelPipelines(1)
                .active(false)
                .build();
    }
}