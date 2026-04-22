package com.datashifter.execution.repositories;

import com.datashifter.common.models.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExecutionConnectionRepository extends JpaRepository<Connection, String> {
}
