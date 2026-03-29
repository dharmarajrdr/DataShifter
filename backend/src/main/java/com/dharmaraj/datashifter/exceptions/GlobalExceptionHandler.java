package com.dharmaraj.datashifter.exceptions;

import com.dharmaraj.datashifter.dtos.response.ApiResponseDto;
import com.dharmaraj.datashifter.enums.Status;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CustomException.class)
    public ResponseEntity<ApiResponseDto<?>> handleException(CustomException e) {

        return ResponseEntity.status(e.getStatus()).body(ApiResponseDto.builder().message(e.getMessage()).status(Status.FAILURE).build());
    }
}
