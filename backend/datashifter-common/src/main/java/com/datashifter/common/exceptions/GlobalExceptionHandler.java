package com.datashifter.common.exceptions;

import com.datashifter.common.dtos.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.stream.Collectors;

/**
 * Global exception handler for all Datashifter services.
 *
 * Ensures every error response is a JSON {@link ApiResponse} object,
 * preventing the frontend from receiving HTML error pages or empty bodies.
 *
 * Placed in datashifter-common so all services inherit it via component scan.
 *
 * Response format (always JSON):
 * <pre>
 * {
 *   "message": "Pipeline not found with id: p-999",
 *   "data": null,
 *   "info": null,
 *   "status": 404
 * }
 * </pre>
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Resource not found — 404.
     * Triggered by: ResourceNotFoundException("Pipeline", "p-999")
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNotFound(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage(), 404));
    }

    /**
     * Invalid state transition — 409 Conflict.
     * Triggered by: InvalidStateException(DRAFT, RUNNING)
     */
    @ExceptionHandler(InvalidStateException.class)
    public ResponseEntity<ApiResponse<?>> handleInvalidState(InvalidStateException ex) {
        log.warn("Invalid state: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage(), 409));
    }

    /**
     * Connection errors — 502 Bad Gateway.
     * Triggered by: ConnectionException("Oracle connection refused")
     */
    @ExceptionHandler(ConnectionException.class)
    public ResponseEntity<ApiResponse<?>> handleConnectionError(ConnectionException ex) {
        log.error("Connection error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_GATEWAY)
                .body(ApiResponse.error(ex.getMessage(), 502));
    }

    /**
     * General business logic errors — 400 Bad Request.
     * Triggered by: DatashifterException("Email already registered")
     */
    @ExceptionHandler(DatashifterException.class)
    public ResponseEntity<ApiResponse<?>> handleDatashifterException(DatashifterException ex) {
        log.warn("Business error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage(), 400));
    }

    /**
     * Validation errors — 400 Bad Request.
     * Triggered by: @Valid annotation failures on @RequestBody
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<?>> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", errors);
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Validation failed: " + errors, 400));
    }

    /**
     * Missing request parameters — 400 Bad Request.
     */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiResponse<?>> handleMissingParam(MissingServletRequestParameterException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error("Missing parameter: " + ex.getParameterName(), 400));
    }

    /**
     * No handler found — 404.
     */
    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<ApiResponse<?>> handleNoHandler(NoHandlerFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Endpoint not found: " + ex.getRequestURL(), 404));
    }

    /**
     * Access denied — 403 Forbidden.
     * Triggered by: @RequiresPermission checks
     */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<?>> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        String msg = ex.getMessage() != null ? ex.getMessage() : "Access denied";
        java.util.Map<String, Object> info = null;
        if (msg.contains("Missing permission: ")) {
            String missing = msg.substring(msg.indexOf("Missing permission: ") + "Missing permission: ".length()).trim();
            info = java.util.Map.of("missingPermission", missing);
        }
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(msg, 403, info));
    }

    /**
     * Catch-all for any unhandled exception — 500 Internal Server Error.
     * Logs the full stack trace for debugging.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<?>> handleGeneric(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error: " + ex.getMessage(), 500));
    }
}