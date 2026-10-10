package com.datashifter.common.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import java.lang.reflect.Method;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PermissionInterceptorTest {

    private PermissionInterceptor interceptor;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    // Dummy controller for test HandlerMethods
    static class TestController {
        @RequiresPermission("connection:test")
        public void testEndpoint() {}

        @RequiresPermission(anyOf = {"connection:create", "pipeline:create"})
        public void anyOfEndpoint() {}

        public void publicEndpoint() {}
    }

    private TestController controller;

    @BeforeEach
    void setUp() {
        interceptor = new PermissionInterceptor();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        controller = new TestController();
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void testAllowedWhenNoAnnotation() throws Exception {
        Method method = TestController.class.getMethod("publicEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void testAllowedWhenPermissionMatchesValue() throws Exception {
        Method method = TestController.class.getMethod("testEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        request.setAttribute("permissions", Set.of("connection:test", "connection:browse_schema"));

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    void testDeniedWhenPermissionMissingValue() throws Exception {
        Method method = TestController.class.getMethod("testEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        request.setAttribute("permissions", Set.of("connection:browse_schema"));

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("connection:test");
        assertThat(response.getContentAsString()).contains("\"status\":403");
    }

    @Test
    void testAllowedWhenPermissionMatchesAnyOf() throws Exception {
        Method method = TestController.class.getMethod("anyOfEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        request.setAttribute("permissions", Set.of("pipeline:create"));

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
    }

    @Test
    void testDeniedWhenPermissionMissingAllAnyOf() throws Exception {
        Method method = TestController.class.getMethod("anyOfEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        request.setAttribute("permissions", Set.of("pipeline:view"));

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void testPermissionsResolvedFromUserContextWhenAttributeAbsent() throws Exception {
        Method method = TestController.class.getMethod("testEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        UserContext.set(UserContext.Context.builder()
                .permissions(Set.of("connection:test"))
                .build());

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
    }

    @Test
    void testDeniedWhenNoPermissionsAtAll() throws Exception {
        Method method = TestController.class.getMethod("testEndpoint");
        HandlerMethod handlerMethod = new HandlerMethod(controller, method);

        // No attribute, no UserContext
        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
    }
}
