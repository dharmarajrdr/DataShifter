package com.datashifter.common.repositories;

import com.datashifter.common.models.OrgPurchasedAdapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrgPurchasedAdapterRepository extends JpaRepository<OrgPurchasedAdapter, String> {

    List<OrgPurchasedAdapter> findByOrganizationIdAndStatus(String organizationId, String status);

    Optional<OrgPurchasedAdapter> findByOrganizationIdAndMarketplaceItemId(String organizationId, String marketplaceItemId);

    boolean existsByOrganizationIdAndMarketplaceItemId(String organizationId, String marketplaceItemId);

    @Query("SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END FROM OrgPurchasedAdapter p " +
           "WHERE p.organizationId = :orgId AND p.marketplaceItem.adapterKey = :adapterKey AND p.status = 'ACTIVE'")
    boolean isAdapterPurchasedByOrg(@Param("orgId") String orgId, @Param("adapterKey") String adapterKey);
}
