package com.datashifter.payment.services;

import com.datashifter.common.exceptions.DatashifterException;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import jakarta.annotation.PostConstruct;

@Service
@Slf4j
public class RazorpayProvider {

    @Value("${datashifter.razorpay.key-id}")
    private String keyId;

    @Value("${datashifter.razorpay.key-secret}")
    private String keySecret;

    private RazorpayClient client;

    @PostConstruct
    public void init() {
        try {
            this.client = new RazorpayClient(keyId, keySecret);
            log.info("Razorpay client initialized (key: {}...)", keyId.substring(0, Math.min(10, keyId.length())));
        } catch (RazorpayException e) {
            log.error("Failed to initialize Razorpay client: {}", e.getMessage());
        }
    }

    public String getKeyId() {
        return keyId;
    }

    /**
     * Create a Razorpay order.
     * @param amountInPaise amount in smallest unit (paise for INR)
     * @param currency e.g., "INR"
     * @param receiptId unique receipt ID
     * @return Razorpay order ID
     */
    public String createOrder(long amountInPaise, String currency, String receiptId) {
        try {
            JSONObject options = new JSONObject();
            options.put("amount", amountInPaise);
            options.put("currency", currency);
            options.put("receipt", receiptId);
            options.put("payment_capture", 1); // auto-capture

            Order order = client.orders.create(options);
            String orderId = order.get("id");
            log.info("Razorpay order created: {} (amount: {} {}, receipt: {})", orderId, amountInPaise, currency, receiptId);
            return orderId;
        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed: {}", e.getMessage());
            throw new DatashifterException("Payment order creation failed: " + e.getMessage());
        }
    }

    /**
     * Verify Razorpay payment signature.
     * signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
     */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(attributes, keySecret);
        } catch (RazorpayException e) {
            log.error("Razorpay signature verification failed: {}", e.getMessage());
            return false;
        }
    }
}
