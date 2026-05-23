# Auth Service - Routing Guide

## Architecture

```
Client (Port 3000)
    ↓
API Gateway (Port 3000)
    ↓ proxy
Auth Service (Port 3001)
```

---

## Routing Flow

### Client Request

```
POST http://localhost:3000/api/v1/auth/register
```

### API Gateway (Port 3000)

```typescript
// api-gateway/src/server.ts
app.use("/api/v1/auth", proxy("http://localhost:3001"));

// Proxy configuration:
// - Listens on: /api/v1/auth (and sub-paths)
// - Forwards to: http://localhost:3001
// - Strips prefix: /api/v1/auth is removed before forwarding
```

**Result:**
- Gateway receives: `POST /api/v1/auth/register`
- Forwards to auth-service: `POST /register` (prefix `/api/v1/auth` is removed)

### Auth Service (Port 3001)

```typescript
// auth-service/src/app.ts
app.use("/", authRoutes);

// auth-service/src/routes/auth.routes.ts
router.post("/register", register);

// Matching:
// Request: POST /register
// Mount: app.use("/")
// Route: router.post("/register")
// Result: / + /register = /register ✅ MATCH
```

---

## Routing Table

| Client Request | Gateway Receives | Gateway Forwards | Auth Service | Route Match |
|---|---|---|---|---|
| POST /api/v1/auth/register | POST /api/v1/auth/register | POST /register | POST /register | ✅ router.post("/register") |
| POST /api/v1/auth/login | POST /api/v1/auth/login | POST /login | POST /login | ❌ No route |
| GET /api/v1/auth/register | GET /api/v1/auth/register | GET /register | GET /register | ❌ Only POST |

---

## Common Issues

### Issue 1: Route GET /register not found

**Cause:**
- Client sent GET request instead of POST
- Route only defined for POST

**Fix:**
```bash
# ❌ Wrong
curl -X GET http://localhost:3000/api/v1/auth/register

# ✅ Correct
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test","email":"test@example.com","password":"123456"}'
```

---

## Adding New Routes

### 1. Add route in auth service

```typescript
// auth-service/src/routes/auth.routes.ts
router.post("/register", register);
router.post("/login", login);        // ← ADD THIS
router.get("/verify/:id", verify);   // ← ADD THIS
```

### 2. Client calls via gateway

```bash
# Login route (new)
POST http://localhost:3000/api/v1/auth/login

# Verify route (new)
GET http://localhost:3000/api/v1/auth/verify/123
```

### 3. What happens

```
Client: POST /api/v1/auth/login
  ↓
Gateway: Forwards as POST /login
  ↓
Auth Service: 
  app.use("/") + router.post("/login")
  = /login ✅ MATCH
```

---

## Port Summary

| Service | Port | URL |
|---|---|---|
| API Gateway | 3000 | http://localhost:3000 |
| Auth Service | 3001 | http://localhost:3001 |

---

## Troubleshooting

### Test Auth Service Directly

```bash
# Bypass gateway, test auth-service directly
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test","email":"test@example.com","password":"123456"}'

# Expected response:
# {
#   "success": true,
#   "statusCode": 201,
#   "message": "User registered successfully",
#   "data": { "user": {...} },
#   "timestamp": "2026-04-26T10:30:00.000Z"
# }
```

### Test via Gateway

```bash
# Via gateway
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test","email":"test@example.com","password":"123456"}'

# Should return same response as direct call
```

---

## Important Notes

1. **Prefix Stripping**: Gateway proxy removes `/api/v1/auth` before forwarding
2. **Method Matters**: Route method (GET/POST) must match request method
3. **Content-Type**: Must be `application/json` for JSON requests
4. **Port**: Auth service must be running on 3001 (check .env)
