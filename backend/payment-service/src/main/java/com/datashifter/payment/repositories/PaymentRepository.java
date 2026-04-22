package com.datashifter.payment.repositories;

import com.datashifter.common.models.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, String> {
    Page<Payment> findByOrganization_IdOrderByCreatedAtDesc(String orgId, Pageable pageable);
    Optional<Payment> findByProviderOrderId(String orderId);
    Optional<Payment> findByProviderPaymentId(String paymentId);
    long countByOrganization_Id(String orgId);
}
