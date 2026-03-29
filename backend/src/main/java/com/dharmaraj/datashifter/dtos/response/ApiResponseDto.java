package com.dharmaraj.datashifter.dtos.response;

import com.dharmaraj.datashifter.enums.Status;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)  // Exclude null fields from JSON response
public class ApiResponseDto<T> {

    private String message;

    private T data;

    private Status status;

    private Map<String, Object> info;   // Additional information like pagination, sorting, etc.
}
