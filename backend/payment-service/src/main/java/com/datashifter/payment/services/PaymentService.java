package com.datashifter.payment.services;

import com.datashifter.common.dtos.PaymentDtos.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.exceptions.ResourceNotFoundException;
import com.datashifter.common.models.*;
import com.datashifter.payment.repositories.*;
import com.stripe.model.checkout.Session;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PaymentRepository paymentRepository;
    private final RazorpayProvider razorpayProvider;
    private final StripeProvider stripeProvider;

    @Transactional(readOnly = true)
    public List<PlanResponse> getPlans() {
        return planRepository.findByIsActiveTrueOrderByDisplayOrder().stream()
                .map(this::toPlanResponse).toList();
    }

    @Transactional(readOnly = true)
    public BillingOverviewResponse getBillingOverview(String orgId) {
        SubscriptionResponse sub = subscriptionRepository.findActiveByOrgId(orgId)
                .map(this::toSubscriptionResponse).orElse(null);
        List<PlanResponse> plans = planRepository.findByIsActiveTrueOrderByDisplayOrder().stream()
                .map(this::toPlanResponse).toList();
        List<PaymentResponse> recent = paymentRepository.findByOrganization_IdOrderByCreatedAtDesc(orgId, PageRequest.of(0, 5))
                .getContent().stream().map(this::toPaymentResponse).toList();
        return BillingOverviewResponse.builder()
                .subscription(sub).plans(plans).recentPayments(recent).isOwner(true).build();
    }

    @Transactional(readOnly = true)
    public PaymentHistoryResponse getPaymentHistory(String orgId, int page, int size) {
        SubscriptionResponse sub = subscriptionRepository.findActiveByOrgId(orgId)
                .map(this::toSubscriptionResponse).orElse(null);
        var payments = paymentRepository.findByOrganization_IdOrderByCreatedAtDesc(orgId, PageRequest.of(page, size));
        return PaymentHistoryResponse.builder()
                .currentSubscription(sub)
                .payments(payments.getContent().stream().map(this::toPaymentResponse).toList())
                .totalPayments(payments.getTotalElements()).build();
    }

    @Transactional
    public CheckoutResponse createCheckout(String orgId, CreateCheckoutRequest request) {
        Plan plan = planRepository.findById(request.getPlanId())
                .orElseThrow(() -> new ResourceNotFoundException("Plan", request.getPlanId()));

        long amount = switch (request.getBillingCycle()) {
            case "MONTHLY" -> plan.getPriceMonthly();
            case "HALF_YEARLY" -> plan.getPriceHalfYearly();
            case "YEARLY" -> plan.getPriceYearly();
            default -> throw new DatashifterException("Invalid billing cycle: " + request.getBillingCycle());
        };

        if (amount <= 0) throw new DatashifterException("This plan has no cost for the selected billing cycle");

        Organization org = new Organization();
        org.setId(orgId);

        Payment payment = Payment.builder()
                .organization(org).plan(plan).paymentProvider(request.getProvider())
                .amount(amount).currency(plan.getCurrency()).billingCycle(request.getBillingCycle())
                .status("PENDING").build();

        String orderId;
        String key;

        if ("RAZORPAY".equalsIgnoreCase(request.getProvider())) {
            orderId = razorpayProvider.createOrder(amount, plan.getCurrency(), "ds_" + payment.getId());
            payment.setProviderOrderId(orderId);
            key = razorpayProvider.getKeyId();
        } else if ("STRIPE".equalsIgnoreCase(request.getProvider())) {
            orderId = stripeProvider.createCheckoutSession(
                    amount, plan.getCurrency(), plan.getName(), request.getBillingCycle(),
                    orgId, "http://localhost:3000/settings/billing", "http://localhost:3000/settings/billing");
            payment.setProviderOrderId(orderId);
            key = stripeProvider.getPublishableKey();
        } else {
            throw new DatashifterException("Unsupported provider: " + request.getProvider());
        }

        paymentRepository.save(payment);

        return CheckoutResponse.builder()
                .orderId(orderId).provider(request.getProvider()).amount(amount)
                .currency(plan.getCurrency()).key(key).planName(plan.getName())
                .billingCycle(request.getBillingCycle()).build();
    }

    @Transactional
    public SubscriptionResponse verifyAndActivate(String orgId, VerifyPaymentRequest request) {
        if ("RAZORPAY".equalsIgnoreCase(request.getProvider())) return verifyRazorpay(orgId, request);
        if ("STRIPE".equalsIgnoreCase(request.getProvider())) return verifyStripe(orgId, request);
        throw new DatashifterException("Unsupported provider: " + request.getProvider());
    }

    private SubscriptionResponse verifyRazorpay(String orgId, VerifyPaymentRequest req) {
        boolean valid = razorpayProvider.verifySignature(
                req.getRazorpayOrderId(), req.getRazorpayPaymentId(), req.getRazorpaySignature());
        Payment payment = paymentRepository.findByProviderOrderId(req.getRazorpayOrderId())
                .orElseThrow(() -> new DatashifterException("Payment order not found"));
        if (!valid) {
            payment.setStatus("FAILED");
            payment.setFailureReason("Signature verification failed");
            paymentRepository.save(payment);
            throw new DatashifterException("Payment verification failed — signature mismatch");
        }
        payment.setProviderPaymentId(req.getRazorpayPaymentId());
        payment.setStatus("SUCCESS");
        payment.setPaidAt(Instant.now());
        paymentRepository.save(payment);
        return activateSubscription(orgId, payment);
    }

    private SubscriptionResponse verifyStripe(String orgId, VerifyPaymentRequest req) {
        Session session = stripeProvider.retrieveSession(req.getStripeSessionId());
        Payment payment = paymentRepository.findByProviderOrderId(req.getStripeSessionId())
                .orElseThrow(() -> new DatashifterException("Payment order not found"));
        if (!"complete".equals(session.getStatus()) || !"paid".equals(session.getPaymentStatus())) {
            payment.setStatus("FAILED");
            payment.setFailureReason("Stripe session not paid: " + session.getPaymentStatus());
            paymentRepository.save(payment);
            throw new DatashifterException("Payment not completed");
        }
        payment.setProviderPaymentId(session.getPaymentIntent());
        payment.setStatus("SUCCESS");
        payment.setPaidAt(Instant.now());
        paymentRepository.save(payment);
        return activateSubscription(orgId, payment);
    }

    private SubscriptionResponse activateSubscription(String orgId, Payment payment) {
        subscriptionRepository.findActiveByOrgId(orgId).ifPresent(existing -> {
            existing.setStatus("EXPIRED");
            subscriptionRepository.save(existing);
        });

        Instant now = Instant.now();
        Instant expiresAt = switch (payment.getBillingCycle()) {
            case "MONTHLY" -> now.plus(30, ChronoUnit.DAYS);
            case "HALF_YEARLY" -> now.plus(180, ChronoUnit.DAYS);
            case "YEARLY" -> now.plus(365, ChronoUnit.DAYS);
            default -> now.plus(30, ChronoUnit.DAYS);
        };

        Organization org = new Organization();
        org.setId(orgId);

        Subscription subscription = Subscription.builder()
                .organization(org).plan(payment.getPlan()).billingCycle(payment.getBillingCycle())
                .status("ACTIVE").startedAt(now).expiresAt(expiresAt).autoRenew(true).build();
        subscriptionRepository.save(subscription);

        payment.setSubscription(subscription);
        paymentRepository.save(payment);

        log.info("Subscription activated: org={}, plan={}, cycle={}, expires={}",
                orgId, payment.getPlan().getName(), payment.getBillingCycle(), expiresAt);
        return toSubscriptionResponse(subscription);
    }

    @Transactional
    public void cancelPayment(String orderId) {
        if (orderId == null || orderId.isBlank()) return;
        paymentRepository.findByProviderOrderId(orderId).ifPresent(payment -> {
            if ("PENDING".equals(payment.getStatus())) {
                payment.setStatus("FAILED");
                payment.setFailureReason("Payment cancelled by user");
                paymentRepository.save(payment);
                log.info("Payment cancelled: orderId={}", orderId);
            }
        });
    }

    @Transactional(readOnly = true)
    public String getSubscriptionStatus(String orgId) {
        return subscriptionRepository.findActiveByOrgId(orgId)
                .map(Subscription::getStatus).orElse("NONE");
    }

    @Transactional(readOnly = true)
    public SubscriptionResponse getCurrentSubscription(String orgId) {
        return subscriptionRepository.findActiveByOrgId(orgId)
                .map(this::toSubscriptionResponse).orElse(null);
    }

    private PlanResponse toPlanResponse(Plan p) {
        return PlanResponse.builder()
                .id(p.getId()).name(p.getName()).description(p.getDescription())
                .priceMonthly(p.getPriceMonthly()).priceYearly(p.getPriceYearly()).priceHalfYearly(p.getPriceHalfYearly())
                .currency(p.getCurrency()).maxPipelines(p.getMaxPipelines()).maxConnections(p.getMaxConnections())
                .maxRowsPerMonth(p.getMaxRowsPerMonth()).maxMembers(p.getMaxMembers())
                .parallelPipelines(p.getParallelPipelines()).supportLevel(p.getSupportLevel())
                .featured(p.getIsFeatured()).displayOrder(p.getDisplayOrder()).build();
    }

    private SubscriptionResponse toSubscriptionResponse(Subscription s) {
        long daysRemaining = Math.max(0, ChronoUnit.DAYS.between(Instant.now(), s.getExpiresAt()));
        return SubscriptionResponse.builder()
                .id(s.getId()).planId(s.getPlan().getId()).planName(s.getPlan().getName())
                .billingCycle(s.getBillingCycle()).status(s.getStatus())
                .startedAt(s.getStartedAt()).expiresAt(s.getExpiresAt())
                .autoRenew(s.getAutoRenew()).daysRemaining(daysRemaining).build();
    }

    private PaymentResponse toPaymentResponse(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId()).planName(p.getPlan().getName()).billingCycle(p.getBillingCycle())
                .paymentProvider(p.getPaymentProvider()).providerPaymentId(p.getProviderPaymentId())
                .amount(p.getAmount()).currency(p.getCurrency()).status(p.getStatus())
                .paidAt(p.getPaidAt()).failureReason(p.getFailureReason()).createdAt(p.getCreatedAt()).build();
    }
}