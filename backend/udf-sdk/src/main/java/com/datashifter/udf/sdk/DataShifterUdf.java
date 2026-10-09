package com.datashifter.udf.sdk;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a method as a DataShifter User Defined Function.
 * The annotated method must take exactly one parameter of type {@link Row}.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface DataShifterUdf {
    String name() default "";
    String description() default "";
}
