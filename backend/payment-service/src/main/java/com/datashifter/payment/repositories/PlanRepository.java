package com.datashifter.payment.repositories;

import com.datashifter.common.models.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanRepository extends JpaRepository<Plan, String> {
    List<Plan> findByIsActiveTrueOrderByDisplayOrder();
    Optional<Plan> findByName(String name);
}
