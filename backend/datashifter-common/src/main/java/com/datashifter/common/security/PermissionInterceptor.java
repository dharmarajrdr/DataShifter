package com.datashifter.common.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Set;

/**
 * Intercepts requests to methods annotated with @RequiresPermission.
 * Checks the user's effective permissions (set by JwtAuthFilter).
 *
 * Register in each service's WebMvcConfigurer:
 *   registry.addInterceptor(permissionInterceptor);
 */
@Component
public class PermissionInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod method)) return true;

        RequiresPermission annotation = method.getMethodAnnotation(RequiresPermission.class);
        if (annotation == null) return true;

        @SuppressWarnings("unchecked")
        Set<String> permissions = (Set<String>) request.getAttribute("permissions");
        if (permissions == null && UserContext.getCurrent() != null) {
            permissions = UserContext.getCurrent().getPermissions();
        }

        if (!annotation.value().isEmpty()) {
            if (permissions == null || !permissions.contains(annotation.value())) {
                sendForbidden(response, annotation.value());
                return false;
            }
        }

        if (annotation.anyOf().length > 0) {
            boolean matched = false;
            if (permissions != null) {
                for (String perm : annotation.anyOf()) {
                    if (permissions.contains(perm)) {
                        matched = true;
                        break;
                    }
                }
            }
            if (!matched) {
                sendForbidden(response, annotation.anyOf()[0]);
                return false;
            }
        }

        return true;
    }

    private void sendForbidden(HttpServletResponse response, String missingPermission) throws IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");
        response.getWriter().write(
            "{\"message\":\"Access denied. Missing permission: " + missingPermission + "\"," +
            "\"status\":403," +
            "\"info\":{\"missingPermission\":\"" + missingPermission + "\"}}"
        );
    }
}