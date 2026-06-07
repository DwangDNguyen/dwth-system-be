Gateway authentication

- Purpose: validate JWT at gateway level and forward user info to downstream services.

Behavior:

- Gateway middleware verifies `Authorization: Bearer <token>` for `/api/v1/*` except public auth routes.
- When proxying to auth-service, gateway forwards:
    - `authorization` header as-is
    - `x-user-id`, `x-user-email`, `x-user-role` headers when available

Environment:

- JWT_ACCESS_SECRET must be set in gateway env to validate tokens (same secret as auth-service).

Install:

```
cd api-gateway
npm install
```

Run (dev):

```
npm run dev
```
