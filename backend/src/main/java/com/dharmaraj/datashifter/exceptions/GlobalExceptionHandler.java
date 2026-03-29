package com.dharmaraj.datashifter.exceptions;

import java.util.HashMap;
import java.util.Map;

import com.dharmaraj.datashifter.dtos.response.ApiResponseDto;
import com.dharmaraj.datashifter.enums.Status;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centralized exception-to-response mapping for REST APIs.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponseDto<?>> handleCustomException(CustomException exception) {

        return ResponseEntity.status(exception.getStatus()).body(ApiResponseDto.builder().message(exception.getMessage()).status(Status.FAILURE).build());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponseDto<?>> handleValidationException(MethodArgumentNotValidException exception) {

        Map<String, Object> details = new HashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            details.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        return ResponseEntity.badRequest().body(ApiResponseDto.builder().message("Validation failed").status(Status.FAILURE).info(details).build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponseDto<?>> handleUnhandledException(Exception exception) {

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponseDto.builder().message(exception.getMessage()).status(Status.FAILURE).build());
    }
}
