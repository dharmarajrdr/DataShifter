package com.datashifter.common.services;

import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Plan;
import com.datashifter.common.models.Subscription;
import com.datashifter.common.repositories.CommonPlanRepository;
import com.datashifter.common.repositories.CommonSubscriptionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SubscriptionLimitCheckerTest {

    @Mock
    private CommonSubscriptionRepository subscriptionRepository;

    @Mock
    private CommonPlanRepository planRepository;

    @InjectMocks
    private SubscriptionLimitChecker limitChecker;

    private Plan dbFreePlan;

    @BeforeEach
    void setUp() {
        dbFreePlan = Plan.builder()
                .name("Free")
                .maxPipelines(2)
                .maxConnections(4)
                .maxRowsPerMonth(50_000L)
                .maxMembers(2)
                .parallelPipelines(1)
                .displayOrder(0)
                .build();
    }

    @Test
    void getLimits_whenNoSubscription_loadsFromDatabaseFreePlan() {
        when(subscriptionRepository.findActiveWithPlan("org-1")).thenReturn(Optional.empty());
        when(planRepository.findFreePlan()).thenReturn(Optional.of(dbFreePlan));

        SubscriptionLimitChecker.PlanLimits limits = limitChecker.getLimits("org-1");

        assertThat(limits.getPlanName()).isEqualTo("Free");
        assertThat(limits.getMaxConnections()).isEqualTo(4);
        assertThat(limits.getMaxPipelines()).isEqualTo(2);
    }

    @Test
    void getLimits_whenNoSubscriptionAndDbEmpty_usesFallbackFreeTier() {
        when(subscriptionRepository.findActiveWithPlan("org-1")).thenReturn(Optional.empty());
        when(planRepository.findFreePlan()).thenReturn(Optional.empty());

        SubscriptionLimitChecker.PlanLimits limits = limitChecker.getLimits("org-1");

        assertThat(limits.getPlanName()).isEqualTo("Free");
        assertThat(limits.getMaxConnections()).isEqualTo(4);
    }

    @Test
    void assertCanCreateConnection_allowsUpToMaxConnections() {
        when(subscriptionRepository.findActiveWithPlan("org-1")).thenReturn(Optional.empty());
        when(planRepository.findFreePlan()).thenReturn(Optional.of(dbFreePlan));

        // When user has 2 connections, creating a 3rd should succeed (2 < 4)
        limitChecker.assertCanCreateConnection("org-1", 2);

        // When user has 3 connections, creating a 4th should succeed (3 < 4)
        limitChecker.assertCanCreateConnection("org-1", 3);

        // When user has 4 connections, creating a 5th should fail (4 >= 4)
        assertThatThrownBy(() -> limitChecker.assertCanCreateConnection("org-1", 4))
                .isInstanceOf(DatashifterException.class)
                .hasMessageContaining("Connection limit reached. Your Free plan allows 4 connections.");
    }
}
