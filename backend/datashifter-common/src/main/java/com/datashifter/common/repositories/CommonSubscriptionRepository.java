package com.datashifter.common.repositories;

import com.datashifter.common.models.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommonSubscriptionRepository extends JpaRepository<Subscription, String> {

    @Query("SELECT s FROM Subscription s JOIN FETCH s.plan WHERE s.organization.id = :orgId AND s.status IN ('ACTIVE', 'PAST_DUE') ORDER BY s.createdAt DESC")
    Optional<Subscription> findActiveWithPlan(@Param("orgId") String orgId);
}