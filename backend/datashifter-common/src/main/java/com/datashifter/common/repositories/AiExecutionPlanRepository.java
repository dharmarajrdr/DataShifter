package com.datashifter.common.repositories;

import com.datashifter.common.models.AiExecutionPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiExecutionPlanRepository extends JpaRepository<AiExecutionPlan, String> {

    List<AiExecutionPlan> findBySessionIdOrderByCreatedAtDesc(String sessionId);

    Optional<AiExecutionPlan> findByIdAndOrgId(String id, String orgId);
}
