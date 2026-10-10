package com.datashifter.payment.config;

import com.datashifter.common.models.Plan;
import com.datashifter.payment.repositories.PlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds default subscription plans on startup (only if none exist).
 * Prices in paise (INR). 100 paise = 1 INR.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataLoader implements CommandLineRunner {

    private final PlanRepository planRepository;

    @Override
    public void run(String... args) {
        if (planRepository.count() > 0) return;
        log.info("Seeding default subscription plans...");

        planRepository.save(Plan.builder()
                .name("Free").description("Get started with basic migrations")
                .priceMonthly(0L).priceHalfYearly(0L).priceYearly(0L).currency("INR")
                .maxPipelines(2).maxConnections(4).maxRowsPerMonth(50_000L)
                .maxMembers(2).parallelPipelines(1).supportLevel("COMMUNITY")
                .displayOrder(0).isActive(true).isFeatured(false).build());

        planRepository.save(Plan.builder()
                .name("Starter").description("For small teams getting started with data migration")
                .priceMonthly(99900L).priceHalfYearly(499900L).priceYearly(899900L).currency("INR")
                .maxPipelines(10).maxConnections(10).maxRowsPerMonth(5_000_000L)
                .maxMembers(5).parallelPipelines(2).supportLevel("EMAIL")
                .displayOrder(1).isActive(true).isFeatured(false).build());

        planRepository.save(Plan.builder()
                .name("Pro").description("For growing teams with complex migration needs")
                .priceMonthly(249900L).priceHalfYearly(1249900L).priceYearly(2249900L).currency("INR")
                .maxPipelines(50).maxConnections(50).maxRowsPerMonth(100_000_000L)
                .maxMembers(20).parallelPipelines(5).supportLevel("PRIORITY")
                .displayOrder(2).isActive(true).isFeatured(true).build());

        planRepository.save(Plan.builder()
                .name("Business").description("For large organizations running production migrations")
                .priceMonthly(499900L).priceHalfYearly(2499900L).priceYearly(4499900L).currency("INR")
                .maxPipelines(200).maxConnections(200).maxRowsPerMonth(1_000_000_000L)
                .maxMembers(50).parallelPipelines(10).supportLevel("DEDICATED")
                .displayOrder(3).isActive(true).isFeatured(false).build());

        planRepository.save(Plan.builder()
                .name("Enterprise").description("Unlimited everything with custom SLA and support")
                .priceMonthly(999900L).priceHalfYearly(4999900L).priceYearly(8999900L).currency("INR")
                .maxPipelines(-1).maxConnections(-1).maxRowsPerMonth(-1L)
                .maxMembers(-1).parallelPipelines(-1).supportLevel("DEDICATED_24x7")
                .displayOrder(4).isActive(true).isFeatured(false).build());

        log.info("5 subscription plans seeded");
    }
}
