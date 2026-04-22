package com.datashifter.payment.services;

import com.datashifter.common.exceptions.DatashifterException;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class StripeProvider {

    @Value("${datashifter.stripe.secret-key}")
    private String secretKey;

    @Value("${datashifter.stripe.publishable-key}")
    private String publishableKey;

    @Value("${datashifter.stripe.webhook-secret}")
    private String webhookSecret;

    @PostConstruct
    public void init() {
        Stripe.apiKey = secretKey;
        log.info("Stripe client initialized (key: {}...)", publishableKey.substring(0, Math.min(12, publishableKey.length())));
    }

    public String getPublishableKey() {
        return publishableKey;
    }

    /**
     * Create a Stripe Checkout Session.
     * Returns the session ID for client-side redirect.
     */
    public String createCheckoutSession(long amountInCents, String currency, String planName,
                                         String billingCycle, String orgId, String successUrl, String cancelUrl) {
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(currency.toLowerCase())
                                    .setUnitAmount(amountInCents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("DataShifter " + planName + " (" + billingCycle + ")")
                                            .build())
                                    .build())
                            .build())
                    .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .putMetadata("orgId", orgId)
                    .putMetadata("billingCycle", billingCycle)
                    .putMetadata("planName", planName)
                    .build();

            Session session = Session.create(params);
            log.info("Stripe checkout session created: {} (amount: {} {}, plan: {})", session.getId(), amountInCents, currency, planName);
            return session.getId();
        } catch (StripeException e) {
            log.error("Stripe session creation failed: {}", e.getMessage());
            throw new DatashifterException("Stripe checkout failed: " + e.getMessage());
        }
    }

    /**
     * Retrieve a Stripe Checkout Session to verify payment.
     */
    public Session retrieveSession(String sessionId) {
        try {
            return Session.retrieve(sessionId);
        } catch (StripeException e) {
            log.error("Stripe session retrieval failed: {}", e.getMessage());
            throw new DatashifterException("Failed to verify Stripe payment: " + e.getMessage());
        }
    }

    /**
     * Verify Stripe webhook signature.
     */
    public com.stripe.model.Event verifyWebhook(String payload, String sigHeader) {
        try {
            return Webhook.constructEvent(payload, sigHeader, webhookSecret);
        } catch (Exception e) {
            log.error("Stripe webhook verification failed: {}", e.getMessage());
            throw new DatashifterException("Invalid Stripe webhook: " + e.getMessage());
        }
    }
}
