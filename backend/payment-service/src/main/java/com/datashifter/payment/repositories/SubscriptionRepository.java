package com.datashifter.payment.repositories;

import com.datashifter.common.models.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, String> {
    Optional<Subscription> findByOrganization_IdAndStatus(String orgId, String status);

    @Query("SELECT s FROM Subscription s WHERE s.organization.id = :orgId AND s.status IN ('ACTIVE', 'PAST_DUE') ORDER BY s.createdAt DESC")
    Optional<Subscription> findActiveByOrgId(@Param("orgId") String orgId);

    @Query("SELECT s FROM Subscription s WHERE s.status = 'ACTIVE' AND s.expiresAt <= :threshold")
    List<Subscription> findExpiringSoon(@Param("threshold") Instant threshold);

    @Query("SELECT s FROM Subscription s WHERE s.status = 'ACTIVE' AND s.expiresAt < :now")
    List<Subscription> findExpired(@Param("now") Instant now);

    List<Subscription> findByOrganization_IdOrderByCreatedAtDesc(String orgId);
}
