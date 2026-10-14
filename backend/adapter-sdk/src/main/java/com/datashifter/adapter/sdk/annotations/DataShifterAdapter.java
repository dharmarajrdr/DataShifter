package com.datashifter.adapter.sdk.annotations;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a class as a DataShifter Adapter implementation for dynamic discovery.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DataShifterAdapter {

    /** Unique programmatic identifier (e.g. "oracle-reader", "postgres-writer") */
    String id();

    /** Human-readable display name (e.g. "Oracle Reader", "PostgreSQL Writer") */
    String name();

    /** Detailed description of the adapter capability */
    String description() default "";

    /** Adapter role: READER or WRITER */
    AdapterType type();

    /** Supported execution modes: BATCH, CDC, or BOTH */
    AdapterMode mode() default AdapterMode.BATCH;

    /** Category grouping: "database", "streaming", "filesystem", etc. */
    String category() default "database";

    /** Semantic version string */
    String version() default "1.0.0";
}
