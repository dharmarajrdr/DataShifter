# Authentication API

DataShifter uses JWT-based authentication with access and refresh tokens.

## Token structure

| Token | Subject | Lifetime | Purpose |
|-------|---------|----------|---------|
| Access token | `userId` (AppUser) | 15 minutes | API authorization, org-scoped |
| Refresh token | `accountId` (Account) | 7 days | Get new access token, org-agnostic |

## Endpoints

### POST /api/v1/auth/signup

Create a new account and optionally an organization.

```json
{
  "fullName": "Dharmaraj R",
  "email": "dharr@example.com",
  "password": "securepassword",
  "orgName": "My Company"
}
```

Response includes `accessToken`, `refreshToken`, `user`, and `organizations` list.

### POST /api/v1/auth/login

Authenticate with email and password.

```json
{
  "email": "dharr@example.com",
  "password": "securepassword"
}
```

Returns tokens scoped to the first organization. Use `/switch-org` to change.

### POST /api/v1/auth/refresh

Exchange a refresh token for new access and refresh tokens.

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

### GET /api/v1/auth/me

Get the current user's profile. Requires `Authorization: Bearer <access_token>`.

### PUT /api/v1/auth/me

Update profile (name, timezone).

```json
{
  "fullName": "Dr. Dharmaraj",
  "timezone": "Asia/Kolkata"
}
```

### PUT /api/v1/auth/me/password

Change password.

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword"
}
```

### POST /api/v1/auth/switch-org

Switch to a different organization. Returns new tokens scoped to that org.

```json
{
  "orgId": "org-uuid-here"
}
```

### GET /api/v1/auth/my-organizations

List all organizations the current account belongs to.

## Authorization header

All authenticated endpoints require:

```
Authorization: Bearer <access_token>
```

When the access token expires (HTTP 401 with `TOKEN_EXPIRED`), use the refresh token to get a new one.
