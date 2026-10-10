package com.datashifter.common.repositories;

import com.datashifter.common.models.Plan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommonPlanRepository extends JpaRepository<Plan, String> {

    Optional<Plan> findFirstByDisplayOrder(Integer displayOrder);

    Optional<Plan> findByName(String name);

    default Optional<Plan> findFreePlan() {
        return findFirstByDisplayOrder(0).or(() -> findByName("Free"));
    }
}
