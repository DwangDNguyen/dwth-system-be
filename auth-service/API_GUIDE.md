# Auth Service - API Response Guide

## Standard Format

```typescript
interface ApiResponse<T = any> {
  success: boolean;              // true = success, false = error
  statusCode: number;            // HTTP status code
  message?: string;              // Message description
  data?: T;                      // Data when success
  errors?: Record<string, string>;  // Errors when fail
  timestamp: string;             // ISO 8601 timestamp
}
```

---

## Success Response

```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "60d5ec49f1b2c72b8c8e4f1a",
      "fullname": "Nguyen Van A",
      "email": "test@example.com",
      "role": "user"
    }
  },
  "timestamp": "2026-04-26T10:30:00.000Z"
}
```

---

## Error Responses

### Validation (400)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": "Email is required",
    "password": "Password must be at least 8 characters"
  },
  "timestamp": "2026-04-26T10:30:00.000Z"
}
```

### Duplicate (400)

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Email already exists",
  "errors": {
    "email": "Email test@example.com already exists"
  },
  "timestamp": "2026-04-26T10:30:00.000Z"
}
```

### Not Found (404)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Route GET /api/users not found",
  "timestamp": "2026-04-26T10:30:00.000Z"
}
```

---

## Backend

```typescript
// Success
const response: ApiResponse = {
  success: true,
  statusCode: 201,
  message: "User registered successfully",
  data: { user: {...} },
  timestamp: new Date().toISOString()
};

res.status(201).json(response);

// Error
throw new ValidationError("Validation failed", {
  email: "Email is required"
});
```

---

## Frontend

```typescript
const result: ApiResponse = await response.json();

if (result.success) {
  console.log(result.data);
  toast.success(result.message);
} else {
  console.log(`Error ${result.statusCode}`);
  if (result.errors) {
    Object.keys(result.errors).forEach(field => {
      toast.error(result.errors[field]);
    });
  }
}
```

---

## Benefits

✅ **Consistent**: Same format for all responses  
✅ **Clear**: `success` boolean + `statusCode`  
✅ **Type-safe**: TypeScript `ApiResponse<T>`  
✅ **Easy**: FE just checks `result.success`  
✅ **Traceable**: `timestamp` for debugging  
✅ **Standard**: NestJS, Spring Boot, ASP.NET Core use similar patterns
