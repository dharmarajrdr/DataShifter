package com.datashifter.common.repositories;

import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.models.MarketplaceCatalogItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MarketplaceCatalogRepository extends JpaRepository<MarketplaceCatalogItem, String> {

    Optional<MarketplaceCatalogItem> findByAdapterKey(String adapterKey);

    List<MarketplaceCatalogItem> findByIsActiveTrueOrderByDisplayOrderAsc();

    List<MarketplaceCatalogItem> findByIsActiveTrueAndAdapterTypeOrderByDisplayOrderAsc(AdapterType adapterType);

    List<MarketplaceCatalogItem> findByIsActiveTrueAndCategoryOrderByDisplayOrderAsc(String category);
}
