package com.datashifter.common.repositories;

import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.models.AdapterDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdapterDefinitionRepository extends JpaRepository<AdapterDefinition, String> {

    Optional<AdapterDefinition> findFirstByAdapterKey(String adapterKey);

    Optional<AdapterDefinition> findFirstByOrganizationIdIsNullAndAdapterKey(String adapterKey);

    default Optional<AdapterDefinition> findByAdapterKey(String adapterKey) {
        return findFirstByAdapterKey(adapterKey);
    }

    List<AdapterDefinition> findAllByAdapterKey(String adapterKey);

    Optional<AdapterDefinition> findByOrganizationIdAndAdapterKey(String organizationId, String adapterKey);

    boolean existsByOrganizationIdAndName(String organizationId, String name);

    boolean existsByOrganizationIdAndAdapterKey(String organizationId, String adapterKey);

    List<AdapterDefinition> findByOrganizationId(String organizationId);

    List<AdapterDefinition> findByIsOfficialTrue();

    @Query("SELECT a FROM AdapterDefinition a WHERE a.organizationId = :orgId OR a.organizationId IS NULL")
    List<AdapterDefinition> findAllAvailableForOrg(@Param("orgId") String orgId);

    @Query("SELECT a FROM AdapterDefinition a WHERE (a.organizationId = :orgId OR a.organizationId IS NULL) AND a.adapterType = :type")
    List<AdapterDefinition> findAvailableByOrgAndType(@Param("orgId") String orgId, @Param("type") AdapterType type);
}
