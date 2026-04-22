package com.datashifter.payment.controllers;

import com.datashifter.common.dtos.ApiResponse;
import com.datashifter.common.dtos.PaymentDtos.*;
import com.datashifter.common.exceptions.DatashifterException;
import com.datashifter.common.models.Organization;
import com.datashifter.common.utils.JwtUtil;
import com.datashifter.payment.repositories.OrgRepository;
import com.datashifter.payment.services.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final OrgRepository orgRepository;
    private final JwtUtil jwtUtil;

    /**
     * Get billing overview — plans, current subscription, recent payments.
     * Only org CREATOR can access.
     */
    @GetMapping("/billing")
    public ApiResponse<BillingOverviewResponse> getBilling(HttpServletRequest request) {
        String orgId = extractOrgId(request);
        assertOrgOwner(request, orgId);
        return ApiResponse.success(paymentService.getBillingOverview(orgId));
    }

    /** Get all plans (public within auth) */
    @GetMapping("/plans")
    public ApiResponse<?> getPlans() {
        return ApiResponse.success(paymentService.getPlans());
    }

    /** Get payment history */
    @GetMapping("/history")
    public ApiResponse<PaymentHistoryResponse> getHistory(
            HttpServletRequest request,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String orgId = extractOrgId(request);
        assertOrgOwner(request, orgId);
        return ApiResponse.success(paymentService.getPaymentHistory(orgId, page, size));
    }

    /** Create checkout order (Razorpay/Stripe) */
    @PostMapping("/checkout")
    public ApiResponse<CheckoutResponse> checkout(HttpServletRequest request, @Valid @RequestBody CreateCheckoutRequest body) {
        String orgId = extractOrgId(request);
        assertOrgOwner(request, orgId);
        return ApiResponse.success(paymentService.createCheckout(orgId, body));
    }

    /** Verify payment and activate subscription */
    @PostMapping("/verify")
    public ApiResponse<SubscriptionResponse> verify(HttpServletRequest request, @Valid @RequestBody VerifyPaymentRequest body) {
        String orgId = extractOrgId(request);
        assertOrgOwner(request, orgId);
        return ApiResponse.success(paymentService.verifyAndActivate(orgId, body), "Subscription activated");
    }

    /** Cancel a pending payment (user dismissed checkout) */
    @PostMapping("/cancel")
    public ApiResponse<Void> cancel(HttpServletRequest request, @RequestBody java.util.Map<String, String> body) {
        String orgId = extractOrgId(request);
        assertOrgOwner(request, orgId);
        paymentService.cancelPayment(body.get("orderId"));
        return ApiResponse.success(null, "Payment cancelled");
    }

    /** Get current subscription status (used by middleware) */
    @GetMapping("/subscription/status")
    public ApiResponse<SubscriptionResponse> subscriptionStatus(HttpServletRequest request) {
        String orgId = extractOrgId(request);
        SubscriptionResponse sub = paymentService.getCurrentSubscription(orgId);
        return ApiResponse.success(sub);
    }

    // =========================================================================
    // OWNER CHECK — Only org.createdBy (Account) can access payments
    // =========================================================================

    private void assertOrgOwner(HttpServletRequest request, String orgId) {
        String accountId = extractAccountId(request);
        Organization org = orgRepository.findById(orgId)
                .orElseThrow(() -> new DatashifterException("Organization not found"));
        if (org.getCreatedBy() == null || !org.getCreatedBy().getId().equals(accountId)) {
            throw new DatashifterException("Only the organization owner can access billing");
        }
    }

    private String extractOrgId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getOrgId(token);
    }

    private String extractAccountId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.getAccountId(token);
    }
}