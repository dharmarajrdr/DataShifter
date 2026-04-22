package com.datashifter.common.dtos;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private String message;
    private T data;
    private Object info;
    private int status;

    public static <T> ApiResponse<T> success(T data) {
        ApiResponse<T> r = new ApiResponse<>();
        r.message = "Success";
        r.data = data;
        r.status = 200;
        return r;
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        ApiResponse<T> r = new ApiResponse<>();
        r.message = message;
        r.data = data;
        r.status = 200;
        return r;
    }

    public static <T> ApiResponse<T> error(String message, int status) {
        ApiResponse<T> r = new ApiResponse<>();
        r.message = message;
        r.status = status;
        return r;
    }

    public static <T> ApiResponse<T> error(String message, int status, Object info) {
        ApiResponse<T> r = new ApiResponse<>();
        r.message = message;
        r.status = status;
        r.info = info;
        return r;
    }
}
