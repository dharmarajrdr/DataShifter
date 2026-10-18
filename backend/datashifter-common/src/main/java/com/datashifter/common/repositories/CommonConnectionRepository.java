package com.datashifter.common.repositories;

import com.datashifter.common.models.Connection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommonConnectionRepository extends JpaRepository<Connection, String> {

    @Query("SELECT COUNT(c) FROM Connection c WHERE c.createdBy.organization.id = :orgId")
    long countByOrgId(@Param("orgId") String orgId);
}
