package com.datashifter.udf.adapters.marketplace;

import com.datashifter.adapter.sdk.annotations.AdapterMode;
import com.datashifter.adapter.sdk.annotations.AdapterType;
import com.datashifter.common.models.AdapterDefinition;
import com.datashifter.common.models.MarketplaceCatalogItem;
import com.datashifter.common.repositories.AdapterDefinitionRepository;
import com.datashifter.common.repositories.MarketplaceCatalogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Seeds official Marketplace Catalog items on startup (<= 100 lines). */
@Component @Order(10) @RequiredArgsConstructor @Slf4j
public class MarketplaceCatalogSeeder implements CommandLineRunner {
    private final MarketplaceCatalogRepository catalogRepo;
    private final AdapterDefinitionRepository adapterRepo;

    @Override @Transactional
    public void run(String... args) { seedMarketplaceCatalog(); }

    public synchronized void seedMarketplaceCatalog() {
        for (MarketplaceCatalogItem item : getOfficialCatalogItems()) {
            Optional<AdapterDefinition> defOpt = adapterRepo.findFirstByOrganizationIdIsNullAndAdapterKey(item.getAdapterKey());
            defOpt.ifPresent(item::setAdapterDefinition);
            catalogRepo.findByAdapterKey(item.getAdapterKey()).ifPresentOrElse(existing -> {
                existing.setName(item.getName()); existing.setDescription(item.getDescription());
                existing.setCategory(item.getCategory()); existing.setAdapterType(item.getAdapterType());
                existing.setSupportedMode(item.getSupportedMode()); existing.setPricePaise(item.getPricePaise());
                existing.setCurrency(item.getCurrency()); existing.setIsFree(item.getIsFree());
                existing.setIconUrl(item.getIconUrl()); existing.setDocumentationUrl(item.getDocumentationUrl());
                existing.setDisplayOrder(item.getDisplayOrder()); existing.setIsActive(item.getIsActive());
                defOpt.ifPresent(existing::setAdapterDefinition);
                catalogRepo.save(existing);
            }, () -> catalogRepo.save(item));
        }
    }

    public List<MarketplaceCatalogItem> getOfficialCatalogItems() {
        List<MarketplaceCatalogItem> items = new ArrayList<>();
        items.add(it("oracle-reader", "Oracle Database Reader", "Enterprise high-throughput batch reader for Oracle databases.", "database", AdapterType.READER, AdapterMode.BATCH, 1, "/icons/oracle.svg"));
        items.add(it("oracle-writer", "Oracle Database Writer", "High-performance target writer for Oracle databases supporting bulk upsert.", "database", AdapterType.WRITER, AdapterMode.BOTH, 2, "/icons/oracle.svg"));
        items.add(it("postgres-reader", "PostgreSQL Database Reader", "Batch reader for PostgreSQL supporting streaming fetch cursors.", "database", AdapterType.READER, AdapterMode.BATCH, 3, "/icons/postgresql.svg"));
        items.add(it("postgres-writer", "PostgreSQL Database Writer", "Target writer for PostgreSQL tables supporting ON CONFLICT upserts.", "database", AdapterType.WRITER, AdapterMode.BOTH, 4, "/icons/postgresql.svg"));
        items.add(it("filesystem-writer", "File System Writer", "Target writer for local and cloud storage producing JSON, CSV, and JSONL.", "storage", AdapterType.WRITER, AdapterMode.BOTH, 5, "/icons/filesystem.svg"));
        items.add(it("kafka-writer", "Apache Kafka Writer", "High-throughput target writer publishing records to Kafka topics.", "messaging", AdapterType.WRITER, AdapterMode.BOTH, 6, "/icons/kafka.svg"));
        items.add(it("oracle-gg-reader", "Oracle GoldenGate CDC Reader", "Enterprise CDC reader consuming Oracle GoldenGate trail files.", "streaming", AdapterType.READER, AdapterMode.CDC, 7, "/icons/oracle-gg.svg"));
        items.add(it("postgres-wal-reader", "PostgreSQL WAL CDC Reader", "Real-time CDC streaming reader streaming PostgreSQL write-ahead logs.", "streaming", AdapterType.READER, AdapterMode.CDC, 8, "/icons/postgresql.svg"));
        items.add(it("spanner-reader", "Spanner Reader", "Enterprise batch reader for Google Cloud Spanner with parallel partition queries.", "database", AdapterType.READER, AdapterMode.BATCH, 9, "/icons/spanner.svg"));
        items.add(it("spanner-writer", "Spanner Writer", "Target writer for Google Cloud Spanner supporting ACID transactions and mutations.", "database", AdapterType.WRITER, AdapterMode.BOTH, 10, "/icons/spanner.svg"));
        items.add(it("bigquery-reader", "BigQuery Reader", "High-throughput reader extracting tables from Google BigQuery via Storage Read API.", "database", AdapterType.READER, AdapterMode.BATCH, 11, "/icons/bigquery.svg"));
        items.add(it("bigquery-writer", "BigQuery Writer", "Scalable target writer for Google BigQuery using Storage Write API stream commits.", "database", AdapterType.WRITER, AdapterMode.BOTH, 12, "/icons/bigquery.svg"));
        items.add(it("bigtable-reader", "BigTable Reader", "Scalable NoSQL reader for Google Cloud Bigtable reading wide-column rows.", "database", AdapterType.READER, AdapterMode.BATCH, 13, "/icons/bigtable.svg"));
        items.add(it("bigtable-writer", "BigTable Writer", "Target writer for Google Cloud Bigtable streaming row mutations and cell values.", "database", AdapterType.WRITER, AdapterMode.BOTH, 14, "/icons/bigtable.svg"));
        return items;
    }

    private MarketplaceCatalogItem it(String k, String n, String d, String c, AdapterType t, AdapterMode m, int o, String ic) {
        return MarketplaceCatalogItem.builder().adapterKey(k).name(n).description(d).category(c).adapterType(t)
                .supportedMode(m).pricePaise(0L).currency("INR").isFree(true).iconUrl(ic)
                .documentationUrl("https://docs.datashifter.io/adapters/" + k).displayOrder(o).isActive(true).build();
    }
}
