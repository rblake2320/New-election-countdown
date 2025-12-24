# Election Tracker API Documentation

Base URL: `http://localhost:5000/api` (development)  
Production: `https://yourdomain.com/api`

## Table of Contents
- [Health Checks](#health-checks)
- [Elections](#elections)
- [Candidates](#candidates)
- [Authentication](#authentication)
- [Congress](#congress)
- [Analytics](#analytics)
- [Error Responses](#error-responses)

---

## Health Checks

### GET /api/health
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-03T12:00:00.000Z"
}
```

### GET /api/health/enhanced
Detailed system health including database status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-03T12:00:00.000Z",
  "database": {
    "connected": true,
    "latency": 45
  },
  "services": {
    "googleCivic": "operational",
    "openFEC": "operational",
    "proPublica": "degraded"
  }
}
```

---

## Elections

### GET /api/elections
Get list of all elections with optional filtering.

**Query Parameters:**
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `state` | string | Filter by state code | `CA`, `NY` |
| `level` | string | Filter by level | `federal`, `state`, `local` |
| `type` | string | Filter by type | `primary`, `general`, `special` |
| `year` | number | Filter by year | `2024`, `2026` |
| `limit` | number | Limit results | `10`, `50` |
| `offset` | number | Pagination offset | `0`, `10` |

**Example Request:**
```
GET /api/elections?state=CA&level=federal&limit=10
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "California Presidential Primary",
    "subtitle": "Democratic and Republican Primaries",
    "location": "California",
    "state": "CA",
    "date": "2024-03-05T00:00:00.000Z",
    "type": "primary",
    "level": "federal",
    "offices": ["President"],
    "description": "California presidential primary election",
    "isActive": true
  }
]
```

### GET /api/elections/:id
Get specific election details.

**Response:**
```json
{
  "id": 1,
  "title": "California Presidential Primary",
  "state": "CA",
  "date": "2024-03-05T00:00:00.000Z",
  "type": "primary",
  "level": "federal",
  "candidates": [
    {
      "id": 101,
      "name": "Jane Smith",
      "party": "D",
      "pollingSupport": 45,
      "pollingTrend": "up",
      "isIncumbent": false
    }
  ]
}
```

### GET /api/elections/:id/candidates
Get all candidates for a specific election.

**Response:**
```json
[
  {
    "id": 101,
    "name": "Jane Smith",
    "party": "D",
    "electionId": 1,
    "pollingSupport": 45,
    "pollingTrend": "up",
    "isIncumbent": false,
    "description": "State Senator since 2020",
    "website": "https://janesmith.com"
  }
]
```

---

## Candidates

### GET /api/candidates
Get list of all candidates.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `party` | string | Filter by party (D, R, I, G) |
| `state` | string | Filter by state |
| `search` | string | Search by name |

**Response:**
```json
[
  {
    "id": 101,
    "name": "Jane Smith",
    "party": "D",
    "electionId": 1,
    "pollingSupport": 45,
    "isVerified": true,
    "profileImageUrl": "https://...",
    "campaignBio": "..."
  }
]
```

### GET /api/candidates/:id
Get specific candidate details.

**Response:**
```json
{
  "id": 101,
  "name": "Jane Smith",
  "party": "D",
  "electionId": 1,
  "pollingSupport": 45,
  "pollingTrend": "up",
  "isIncumbent": false,
  "isVerified": true,
  "profileImageUrl": "https://...",
  "campaignBio": "State Senator representing District 15",
  "website": "https://janesmith.com",
  "socialMedia": {
    "twitter": "@janesmith",
    "facebook": "janesmith"
  }
}
```

---

## Authentication

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "jwt_token_here"
}
```

### POST /api/auth/login
Login existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "token": "jwt_token_here"
}
```

### POST /api/auth/logout
Logout current user.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "ok": true
}
```

### GET /api/auth/me
Get current user info.

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Congress

### GET /api/members
Get list of congress members.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | string | Filter by state (CA, NY, etc.) |
| `chamber` | string | Filter by chamber (house, senate) |
| `party` | string | Filter by party (D, R, I) |

**Response:**
```json
[
  {
    "id": 1,
    "bioguideId": "S000033",
    "name": "Bernie Sanders",
    "party": "I",
    "state": "VT",
    "chamber": "senate",
    "district": null,
    "terms": 3
  }
]
```

### GET /api/bills
Get recent congressional bills.

**Response:**
```json
[
  {
    "id": 1,
    "billNumber": "H.R. 1234",
    "title": "Infrastructure Investment Act",
    "introducedDate": "2024-01-15",
    "status": "In Committee",
    "sponsor": "Rep. Jane Doe"
  }
]
```

---

## Analytics

### GET /api/stats
Get platform statistics.

**Response:**
```json
{
  "totalElections": 587,
  "upcomingElections": 234,
  "totalCandidates": 1543,
  "activeUsers": 12500,
  "lastUpdated": "2025-12-03T12:00:00.000Z"
}
```

### GET /api/global-status
Get global election dashboard data.

**Response:**
```json
{
  "totalCountries": 50,
  "activeElections": 12,
  "nextElection": {
    "country": "France",
    "date": "2024-06-15",
    "type": "Parliamentary"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Invalid request parameters",
  "details": {
    "field": "email",
    "message": "Invalid email format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "server_error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

Rate limits vary by subscription tier:

| Tier | Requests per 15 min |
|------|---------------------|
| Basic | 100 |
| Premium | 1,000 |
| Enterprise | 10,000 |

When rate limited, response includes:
- Status: `429 Too Many Requests`
- Header: `Retry-After: 60` (seconds)

---

## Authentication

Protected endpoints require JWT token in header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

Tokens expire after 24 hours and must be refreshed.

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Number of results per page (default: 50, max: 100)
- `offset`: Number of results to skip (default: 0)

**Response Headers:**
```
X-Total-Count: 587
X-Page-Size: 50
X-Current-Page: 1
```

---

## CORS

API supports CORS with the following allowed origins:
- `http://localhost:5000` (development)
- Your production domain

Allowed methods: GET, POST, PUT, DELETE, OPTIONS

---

## Need Help?

- **Issues**: Report bugs in GitHub issues
- **Questions**: See SETUP.md and CONTRIBUTING.md
- **Security**: See SECURITY.md for vulnerability reporting

---

**Last Updated**: December 3, 2025
