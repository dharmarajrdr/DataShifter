package com.datashifter.common.repositories;

import com.datashifter.common.models.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommonPlanRepository extends JpaRepository<Plan, String> {

    @Query("SELECT p FROM Plan p WHERE p.displayOrder = 0 OR p.name = 'Free' ORDER BY p.displayOrder ASC LIMIT 1")
    Optional<Plan> findFreePlan();
}
