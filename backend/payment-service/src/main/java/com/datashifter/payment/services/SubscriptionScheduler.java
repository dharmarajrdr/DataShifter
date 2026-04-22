package com.datashifter.payment.services;

import com.datashifter.common.models.Subscription;
import com.datashifter.payment.repositories.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

/**
 * Scheduled tasks for subscription management:
 * 1. Expire overdue subscriptions → PAUSE all pipelines
 * 2. Notify org owners when subscription is about to expire (7 days, 3 days, 1 day)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SubscriptionScheduler {

    private final SubscriptionRepository subscriptionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Every 15 minutes: check for expired subscriptions.
     * Mark as EXPIRED and publish event to pause pipelines.
     */
    @Scheduled(fixedRate = 900_000) // 15 min
    @Transactional
    public void checkExpiredSubscriptions() {
        Instant now = Instant.now();
        List<Subscription> expired = subscriptionRepository.findExpired(now);

        for (Subscription sub : expired) {
            sub.setStatus("EXPIRED");
            subscriptionRepository.save(sub);

            String orgId = sub.getOrganization().getId();
            log.warn("Subscription expired: org={}, plan={}, expiredAt={}",
                    orgId, sub.getPlan().getName(), sub.getExpiresAt());

            // Publish event to pause all pipelines for this org
            kafkaTemplate.send("subscription-events", Map.of(
                    "type", "SUBSCRIPTION_EXPIRED",
                    "orgId", orgId,
                    "planName", sub.getPlan().getName()
            ));
        }

        if (!expired.isEmpty()) {
            log.info("Processed {} expired subscriptions", expired.size());
        }
    }

    /**
     * Every hour: check for subscriptions expiring within 7 days.
     * Send notification events.
     */
    @Scheduled(fixedRate = 3_600_000) // 1 hour
    @Transactional(readOnly = true)
    public void checkExpiringSoon() {
        Instant sevenDays = Instant.now().plus(7, ChronoUnit.DAYS);
        List<Subscription> expiring = subscriptionRepository.findExpiringSoon(sevenDays);

        for (Subscription sub : expiring) {
            long daysLeft = ChronoUnit.DAYS.between(Instant.now(), sub.getExpiresAt());

            // Only notify at 7, 3, 1 day marks
            if (daysLeft == 7 || daysLeft == 3 || daysLeft == 1 || daysLeft == 0) {
                String orgId = sub.getOrganization().getId();
                log.info("Subscription expiring soon: org={}, plan={}, daysLeft={}",
                        orgId, sub.getPlan().getName(), daysLeft);

                kafkaTemplate.send("subscription-events", Map.of(
                        "type", "SUBSCRIPTION_EXPIRING",
                        "orgId", orgId,
                        "planName", sub.getPlan().getName(),
                        "daysLeft", daysLeft
                ));
            }
        }
    }
}
