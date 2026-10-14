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

/**
 * Seeds and updates the official Marketplace Catalog items for adapters on platform startup.
 */
@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class MarketplaceCatalogSeeder implements CommandLineRunner {

    private final MarketplaceCatalogRepository catalogRepo;
    private final AdapterDefinitionRepository adapterRepo;

    @Override
    @Transactional
    public void run(String... args) {
        seedMarketplaceCatalog();
    }

    public synchronized void seedMarketplaceCatalog() {
        log.info("Checking and seeding official Marketplace catalog items...");
        List<MarketplaceCatalogItem> items = getOfficialCatalogItems();

        for (MarketplaceCatalogItem item : items) {
            Optional<AdapterDefinition> defOpt = adapterRepo.findByAdapterKey(item.getAdapterKey());
            defOpt.ifPresent(item::setAdapterDefinition);

            catalogRepo.findByAdapterKey(item.getAdapterKey()).ifPresentOrElse(existing -> {
                existing.setName(item.getName());
                existing.setDescription(item.getDescription());
                existing.setCategory(item.getCategory());
                existing.setAdapterType(item.getAdapterType());
                existing.setSupportedMode(item.getSupportedMode());
                existing.setPricePaise(item.getPricePaise());
                existing.setCurrency(item.getCurrency());
                existing.setIsFree(item.getIsFree());
                existing.setIconUrl(item.getIconUrl());
                existing.setDocumentationUrl(item.getDocumentationUrl());
                existing.setDisplayOrder(item.getDisplayOrder());
                existing.setIsActive(item.getIsActive());
                defOpt.ifPresent(existing::setAdapterDefinition);
                catalogRepo.save(existing);
                log.debug("Updated marketplace catalog item: {}", item.getAdapterKey());
            }, () -> {
                catalogRepo.save(item);
                log.info("Registered marketplace catalog item: {}", item.getAdapterKey());
            });
        }
    }

    public List<MarketplaceCatalogItem> getOfficialCatalogItems() {
        List<MarketplaceCatalogItem> items = new ArrayList<>();

        // 1. Oracle Reader (Free)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("oracle-reader")
                .name("Oracle Database Reader")
                .description("Enterprise high-throughput batch reader for Oracle 11g, 12c, 19c, 21c, and 23ai databases with parallel partition splitting.")
                .category("database")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .iconUrl("/icons/oracle.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/oracle-reader")
                .displayOrder(1)
                .isActive(true)
                .build());

        // 2. Oracle Writer (Free)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("oracle-writer")
                .name("Oracle Database Writer")
                .description("High-performance target writer for Oracle databases supporting bulk upsert (MERGE), fast batch inserts, and table truncation.")
                .category("database")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .iconUrl("/icons/oracle.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/oracle-writer")
                .displayOrder(2)
                .isActive(true)
                .build());

        // 3. PostgreSQL Reader (Free)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("postgres-reader")
                .name("PostgreSQL Database Reader")
                .description("Batch reader for PostgreSQL tables supporting streaming fetch cursors and parallel primary key chunk splitting.")
                .category("database")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.BATCH)
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .iconUrl("/icons/postgresql.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/postgres-reader")
                .displayOrder(3)
                .isActive(true)
                .build());

        // 4. PostgreSQL Writer (Free)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("postgres-writer")
                .name("PostgreSQL Database Writer")
                .description("Target writer for PostgreSQL tables supporting ON CONFLICT DO UPDATE upserts and batch prepared statements.")
                .category("database")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .iconUrl("/icons/postgresql.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/postgres-writer")
                .displayOrder(4)
                .isActive(true)
                .build());

        // 5. File System Writer (Free)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("filesystem-writer")
                .name("File System Writer")
                .description("Local and cloud-mounted storage writer producing JSON, JSONL, and RFC 4180 CSV formats with date and table partitioning.")
                .category("storage")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .pricePaise(0L)
                .currency("INR")
                .isFree(true)
                .iconUrl("/icons/filesystem.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/filesystem-writer")
                .displayOrder(5)
                .isActive(true)
                .build());

        // 6. Apache Kafka Writer (₹1,999)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("kafka-writer")
                .name("Apache Kafka Writer")
                .description("High-throughput streaming and batch target writer publishing serialized data records and CDC mutation events directly to Kafka topics.")
                .category("messaging")
                .adapterType(AdapterType.WRITER)
                .supportedMode(AdapterMode.BOTH)
                .pricePaise(199900L)
                .currency("INR")
                .isFree(false)
                .iconUrl("/icons/kafka.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/kafka-writer")
                .displayOrder(6)
                .isActive(true)
                .build());

        // 7. Oracle GoldenGate CDC Reader (₹4,999)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("oracle-gg-reader")
                .name("Oracle GoldenGate CDC Reader")
                .description("Enterprise CDC streaming reader consuming Oracle GoldenGate binary and JSON trail files with sub-second replication latency.")
                .category("streaming")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.CDC)
                .pricePaise(499900L)
                .currency("INR")
                .isFree(false)
                .iconUrl("/icons/oracle-gg.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/oracle-gg-reader")
                .displayOrder(7)
                .isActive(true)
                .build());

        // 8. PostgreSQL WAL CDC Reader (₹2,999)
        items.add(MarketplaceCatalogItem.builder()
                .adapterKey("postgres-wal-reader")
                .name("PostgreSQL WAL CDC Reader")
                .description("Real-time CDC streaming reader streaming PostgreSQL write-ahead logs via logical replication slots and pgoutput plugin.")
                .category("streaming")
                .adapterType(AdapterType.READER)
                .supportedMode(AdapterMode.CDC)
                .pricePaise(299900L)
                .currency("INR")
                .isFree(false)
                .iconUrl("/icons/postgresql.svg")
                .documentationUrl("https://docs.datashifter.io/adapters/postgres-wal-reader")
                .displayOrder(8)
                .isActive(true)
                .build());

        return items;
    }
}
