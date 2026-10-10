package com.datashifter.common.security;

import java.io.IOException;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import com.datashifter.common.utils.JwtUtil;

import org.springframework.data.redis.core.StringRedisTemplate;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this(jwtUtil, null);
    }

    public JwtAuthFilter(JwtUtil jwtUtil, StringRedisTemplate redisTemplate) {
        this.jwtUtil = jwtUtil;
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String header = request.getHeader("Authorization");

            if (header != null && header.startsWith("Bearer ")) {
                String token = header.substring(7);
                try {
                    if (!"access".equals(jwtUtil.getTokenType(token))) {
                        sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "NOT_ACCESS_TOKEN",
                                "Token is not an access token");
                        return;
                    }

                    String userId = jwtUtil.getUserId(token);
                    String accountId = jwtUtil.getAccountId(token);
                    String orgId = jwtUtil.getOrgId(token);
                    String email = jwtUtil.getEmail(token);
                    String role = jwtUtil.getRole(token);
                    Set<String> permissions = jwtUtil.getPermissions(token);

                    if (userId != null && redisTemplate != null) {
                        try {
                            if (Boolean.TRUE.equals(redisTemplate.hasKey("auth:revoked:user:" + userId))) {
                                sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "TOKEN_EXPIRED",
                                        "User membership has been revoked");
                                return;
                            }
                        } catch (Exception ex) {
                            // Redis check failure shouldn't crash if redis is temporarily unreachable
                        }
                    }

                    String principal = userId != null ? userId : accountId;
                    var authorities = permissions.stream().map(SimpleGrantedAuthority::new)
                            .collect(Collectors.toList());
                    var auth = new UsernamePasswordAuthenticationToken(principal, token, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);

                    request.setAttribute("userId", userId);
                    request.setAttribute("accountId", accountId);
                    request.setAttribute("orgId", orgId);
                    request.setAttribute("email", email);
                    request.setAttribute("role", role);
                    request.setAttribute("permissions", permissions);

                    UserContext.set(UserContext.Context.builder()
                            .accountId(accountId)
                            .userId(userId)
                            .email(email)
                            .orgId(orgId)
                            .role(role)
                            .permissions(permissions)
                            .build());

                } catch (io.jsonwebtoken.ExpiredJwtException e) {
                    sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "TOKEN_EXPIRED",
                            "Token expired. Please refresh or login again.");
                    return;
                } catch (io.jsonwebtoken.JwtException | IllegalArgumentException e) {
                    sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "INVALID_TOKEN",
                            "Invalid token: " + e.getMessage());
                    return;
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private void sendError(HttpServletResponse response, int statusCode, String status, String message)
            throws IOException {
        response.setStatus(statusCode);
        response.setContentType("application/json");
        response.getWriter().write("{\"message\":\"" + message + "\",\"status\":\"" + status + "\"}");
    }
}
