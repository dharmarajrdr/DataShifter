package com.datashifter.common.utils;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.Set;

/**
 * JWT utility for token generation and validation.
 *
 * Access token claims:
 *   sub       = userId (AppUser.id — org-specific)
 *   accountId = Account.id (global, same across orgs)
 *   email     = account email
 *   orgId     = active organization ID
 *   role      = role name in active org
 *   perms     = effective permissions (comma-separated)
 *
 * Refresh token:
 *   sub = accountId (Account.id — org-agnostic, allows org switching)
 */
@Component
public class JwtUtil {

    private final SecretKey key;
    private final long accessTokenExpiryMs;
    private final long refreshTokenExpiryMs;

    public JwtUtil(@Value("${datashifter.jwt.secret}") String secret,
                    @Value("${datashifter.jwt.access-token-expiry-ms}") long accessTokenExpiryMs,
                    @Value("${datashifter.jwt.refresh-token-expiry-ms}") long refreshTokenExpiryMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenExpiryMs = accessTokenExpiryMs;
        this.refreshTokenExpiryMs = refreshTokenExpiryMs;
    }

    /** Access token — scoped to AppUser (user-in-org). sub = userId. */
    public String generateAccessToken(String userId, String accountId, String email, String orgId, String roleName, Set<String> permissions) {
        return Jwts.builder()
                .claims(Map.of(
                        "accountId", accountId != null ? accountId : "",
                        "email", email != null ? email : "",
                        "orgId", orgId != null ? orgId : "",
                        "role", roleName != null ? roleName : "",
                        "perms", permissions != null ? String.join(",", permissions) : "",
                        "type", "access"
                ))
                .subject(userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiryMs))
                .signWith(key)
                .compact();
    }

    /** Refresh token — org-agnostic. sub = accountId. Used for org switching. */
    public String generateRefreshToken(String accountId) {
        return Jwts.builder()
                .claims(Map.of("type", "refresh"))
                .subject(accountId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiryMs))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /** userId (AppUser.id) — from access token subject */
    public String getUserId(String token) {
        return parseToken(token).getSubject();
    }

    /** accountId — from access token claims */
    public String getAccountId(String token) {
        return parseToken(token).get("accountId", String.class);
    }

    public String getEmail(String token) {
        return parseToken(token).get("email", String.class);
    }

    public String getOrgId(String token) {
        return parseToken(token).get("orgId", String.class);
    }

    public String getRole(String token) {
        return parseToken(token).get("role", String.class);
    }

    public Set<String> getPermissions(String token) {
        String perms = parseToken(token).get("perms", String.class);
        if (perms == null || perms.isBlank()) return Set.of();
        return Set.of(perms.split(","));
    }

    public String getTokenType(String token) {
        return parseToken(token).get("type", String.class);
    }

    public boolean isValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public long getAccessTokenExpiryMs() {
        return accessTokenExpiryMs;
    }
}
