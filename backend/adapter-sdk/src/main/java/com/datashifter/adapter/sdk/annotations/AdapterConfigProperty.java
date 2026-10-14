package com.datashifter.adapter.sdk.annotations;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Repeatable;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Defines a configuration property required or accepted by an adapter.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.FIELD})
@Repeatable(AdapterConfigProperties.class)
public @interface AdapterConfigProperty {

    /** Property key (e.g. "connectionId", "directoryPath", "topic") */
    String name();

    /** User-friendly label displayed in the pipeline creation wizard */
    String label() default "";

    /** Data type: "string", "number", "boolean", "password", "directory", "connection" */
    String type() default "string";

    /** Tooltip or explanation of the property */
    String description() default "";

    /** Whether this property is mandatory */
    boolean required() default false;

    /** Default fallback value if not specified by user */
    String defaultValue() default "";
}
