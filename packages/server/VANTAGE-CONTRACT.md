# VANTAGE API Contract

This document describes every endpoint consumed by VANTAGE (the AI overlay) on the Indomitable Unity platform. It is the authoritative reference for integration.

---

## Authentication

All VANTAGE challenge endpoints require an API key passed in the `X-API-Key` header.

```
X-API-Key: <raw-key>
```

The raw key is provided exactly once at creation. Keys are stored as SHA-256 hashes; the platform never stores or logs the raw value.

**Key creation** uses cookie-based admin authentication (not API key auth). An admin must be logged in via the web application.

---

## Rate Limiting

| Window     | Limit       | Scope       |
|------------|-------------|-------------|
| 60 seconds | 60 requests | Per API key |

Rate limit headers follow the `RateLimit` draft-8 standard (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).

Exceeded limit response:
```
HTTP 429 Too Many Requests
{ "error": "Rate limit exceeded" }
```

---

## Endpoints

### POST /api/vantage/keys

Create a new API key. **Requires admin session (cookie auth).** Not callable by VANTAGE itself.

**Auth:** `Cookie: access_token=<jwt>` (admin role required)

**Request body:**
```json
{
  "name": "VANTAGE Production Key",
  "scopes": ["vantage"],
  "expiresInDays": 365
}
```

| Field          | Type       | Required | Default      | Constraints          |
|----------------|------------|----------|--------------|----------------------|
| `name`         | `string`   | Yes      | —            | 1–100 characters     |
| `scopes`       | `string[]` | No       | `["vantage"]`| Array of scope names |
| `expiresInDays`| `number`   | No       | `365`        | Positive integer     |

**Response 201:**
```json
{
  "key": "a3f8...raw64hexchars...",
  "id": "uuid",
  "name": "VANTAGE Production Key",
  "scopes": ["vantage"],
  "expiresAt": "2027-03-16T12:00:00.000Z"
}
```

> **Important:** The `key` field contains the raw API key. It is returned exactly once and cannot be retrieved again. Store it securely.

**Error responses:**

| Status | Body                         | Reason                       |
|--------|------------------------------|------------------------------|
| `400`  | `{ "error": { ... } }`       | Validation failure           |
| `401`  | `{ "error": "..." }`         | Not authenticated            |
| `403`  | `{ "error": "..." }`         | Not admin                    |

---

### GET /api/vantage/challenges

List open challenges with pagination and optional domain filter.

**Auth:** `X-API-Key: <raw-key>`

**Query parameters:**

| Parameter | Type     | Default | Max  | Description                          |
|-----------|----------|---------|------|--------------------------------------|
| `page`    | `number` | `1`     | —    | Page number (1-indexed)              |
| `limit`   | `number` | `20`    | `100`| Items per page                       |
| `domain`  | `string` | —       | —    | Filter by domain (exact array match) |

**Response 200:**
```json
{
  "challenges": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string",
      "domain": ["string"],
      "skillsNeeded": ["string"],
      "type": "paid | free",
      "deadline": "2025-06-01 | null",
      "circleSize": 4,
      "status": "open",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Challenge object fields:**

| Field          | Type            | Description                                    |
|----------------|-----------------|------------------------------------------------|
| `id`           | `string` (UUID) | Challenge identifier                           |
| `title`        | `string`        | Challenge title                                |
| `description`  | `string`        | Challenge description                          |
| `domain`       | `string[]`      | Domain tags (e.g. `["health", "education"]`)   |
| `skillsNeeded` | `string[]`      | Required skills                                |
| `type`         | `"paid"/"free"` | Whether the challenge offers payment           |
| `deadline`     | `string\|null`  | ISO date string or null (no deadline)          |
| `circleSize`   | `number`        | Target circle size (typically 4)               |
| `status`       | `"open"`        | Always `"open"` in this endpoint               |
| `createdAt`    | `string`        | ISO timestamp of creation                      |

**Error responses:**

| Status | Body                              | Reason                    |
|--------|-----------------------------------|---------------------------|
| `401`  | `{ "error": "API key required" }` | Missing X-API-Key header  |
| `401`  | `{ "error": "Invalid or expired API key" }` | Bad/expired key |
| `429`  | `{ "error": "Rate limit exceeded" }` | Rate limit hit         |

---

### GET /api/vantage/challenges/:id

Retrieve a single challenge by UUID.

**Auth:** `X-API-Key: <raw-key>`

**Path parameters:**

| Parameter | Type            | Description          |
|-----------|-----------------|----------------------|
| `id`      | `string` (UUID) | Challenge identifier |

**Response 200:**
```json
{
  "id": "uuid",
  "createdBy": "uuid",
  "title": "string",
  "description": "string",
  "brief": "string",
  "domain": ["string"],
  "skillsNeeded": ["string"],
  "type": "paid | free",
  "deadline": "2025-06-01 | null",
  "circleSize": 4,
  "status": "open | draft | closed | archived",
  "interestCount": 12,
  "stripeCustomerId": "cus_xxx | null",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

> The single-challenge endpoint returns the full row including `brief`, `interestCount`, and `updatedAt`, which are omitted from the list endpoint for brevity.

**Error responses:**

| Status | Body                                | Reason                    |
|--------|-------------------------------------|---------------------------|
| `401`  | `{ "error": "API key required" }`   | Missing X-API-Key header  |
| `401`  | `{ "error": "Invalid or expired API key" }` | Bad/expired key |
| `404`  | `{ "error": "Challenge not found" }` | No matching challenge    |
| `429`  | `{ "error": "Rate limit exceeded" }` | Rate limit hit           |

---

## Security Notes

1. **Never log API keys.** The `X-API-Key` header value must not appear in server logs.
2. **Key rotation.** Issue a new key before the old one expires. The `expiresAt` field in the creation response indicates expiry.
3. **Key revocation.** Set `is_active = false` in the `api_keys` table to immediately revoke a key without waiting for expiry.
4. **Scope enforcement.** The `scopes` array is stored for future use. Current validation only checks for key validity; scope-based access control will be layered on in a future plan.

---

## Changelog

| Date       | Change                                         |
|------------|------------------------------------------------|
| 2026-03-16 | Initial contract — key creation + challenge endpoints |
