package com.datashifter.common.security;

import lombok.Builder;
import lombok.Getter;

import java.util.Set;

public class UserContext {

    private static final ThreadLocal<Context> CONTEXT = new ThreadLocal<>();

    @Getter
    @Builder
    public static class Context {
        private String accountId;
        private String userId;
        private String email;
        private String orgId;
        private String role;
        private Set<String> permissions;
    }

    public static void set(Context context) { CONTEXT.set(context); }
    public static void clear() { CONTEXT.remove(); }
    public static Context getCurrent() { return CONTEXT.get(); }

    public static String getCurrentAccountId() {
        Context ctx = CONTEXT.get();
        return ctx != null ? ctx.getAccountId() : null;
    }

    public static String getCurrentUserId() {
        Context ctx = CONTEXT.get();
        return ctx != null ? ctx.getUserId() : null;
    }

    public static String getCurrentEmail() {
        Context ctx = CONTEXT.get();
        return ctx != null ? ctx.getEmail() : null;
    }

    public static String getCurrentOrgId() {
        Context ctx = CONTEXT.get();
        return ctx != null ? ctx.getOrgId() : null;
    }

    public static String getCurrentRole() {
        Context ctx = CONTEXT.get();
        return ctx != null ? ctx.getRole() : null;
    }

    public static boolean hasPermission(String permission) {
        Context ctx = CONTEXT.get();
        return ctx != null && ctx.getPermissions() != null && ctx.getPermissions().contains(permission);
    }
}
