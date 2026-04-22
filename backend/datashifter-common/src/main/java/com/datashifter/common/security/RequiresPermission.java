package com.datashifter.common.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotate controller methods to enforce permission checks.
 *
 * Usage:
 *   @RequiresPermission("pipeline:create")
 *   public ApiResponse<...> createPipeline(...) { ... }
 *
 * The PermissionInterceptor checks if the authenticated user's
 * effective permissions include the required permission.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresPermission {
    String value();
}