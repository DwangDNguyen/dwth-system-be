Auth-service middleware

- Purpose: provide authentication for direct calls and accept trusted forwarded user info from gateway.

Behavior:

- If headers `x-user-id`, `x-user-email`, `x-user-role` are present, the middleware trusts them and attaches `req.user`.
- Otherwise it falls back to verifying `Authorization: Bearer <token>` using `JWT_ACCESS_SECRET`.

Environment:

- `JWT_ACCESS_SECRET` must be set and match gateway when gateway validates tokens.

Install & Run:

```
cd auth-service
npm install
npm run dev
```

Notes:

- Keep secrets synchronized between services (or use a shared secret store in production).
- For higher security, consider mutual TLS or service-to-service authentication and avoid relying solely on forwarded headers across untrusted networks.
