package com.datashifter.connector.repositories;

import com.datashifter.common.enums.ConnectionStatus;
import com.datashifter.common.enums.DatabaseType;
import com.datashifter.common.models.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ConnectionRepository extends JpaRepository<Connection, String> {
    List<Connection> findByStatus(ConnectionStatus status);
    List<Connection> findByDbType(DatabaseType dbType);

    @Query("SELECT c FROM Connection c WHERE c.createdBy.organization.id = :orgId")
    List<Connection> findByOrgId(@Param("orgId") String orgId);

    @Query("SELECT c FROM Connection c WHERE c.name = :name AND c.createdBy.organization.id = :orgId")
    java.util.Optional<Connection> findByNameAndOrgId(@Param("name") String name, @Param("orgId") String orgId);
}
