package com.datashifter.pipeline.repositories;

import com.datashifter.common.models.Namespace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NamespaceRepository extends JpaRepository<Namespace, String> {

    Optional<Namespace> findByName(String name);
    boolean existsByName(String name);

    @Query("SELECT n FROM Namespace n WHERE n.createdBy.organization.id = :orgId")
    List<Namespace> findByOrgId(@Param("orgId") String orgId);

    @Query("SELECT n FROM Namespace n WHERE n.createdBy.organization.id = :orgId AND n.name = :name")
    Optional<Namespace> findByOrgIdAndName(@Param("orgId") String orgId, @Param("name") String name);

    @Query("SELECT CASE WHEN COUNT(n) > 0 THEN true ELSE false END FROM Namespace n WHERE n.createdBy.organization.id = :orgId AND n.name = :name")
    boolean existsByOrgIdAndName(@Param("orgId") String orgId, @Param("name") String name);

    @Query("SELECT n FROM Namespace n WHERE n.name = 'Default' AND n.createdBy.organization.id = :orgId")
    Optional<Namespace> findDefault(@Param("orgId") String orgId);
}
