# Logging and Error Handling Guide

This document explains the current logging and error handling setup for the DWth microservice system. It is written for developers who want to understand the architecture, how to use it, and why each part exists.

## 1. Overview

This repository has three services:

- `api-gateway`
- `auth-service`
- `mail-service`

Each service now uses `winston` for structured logging and includes middleware for:

- request logging
- global error handling
- 404 handling
- proxy error handling in `api-gateway`

The goal is to make logs consistent, traceable, and suitable for production systems.

## 2. Logging flow

### 2.1 API Gateway

The gateway receives incoming HTTP requests and does the following:

1. `requestLoggingMiddleware` logs each request with:
    - `requestId`
    - `method`
    - `path`
    - `query`
    - `ip`
    - `userAgent`
2. The request is authenticated by `authenticate.middleware` if it reaches `/api/v1`.
3. Requests to `/api/v1/auth` are proxied to `auth-service`.
4. Proxy requests forward:
    - `Authorization` header
    - `x-user-id`, `x-user-email`, `x-user-role` if available
    - `x-request-id` so downstream services can correlate logs
5. If the proxy fails, `proxyErrorHandler` logs the failure and returns a safe `502` response.
6. If no route matches, `notFoundHandler` logs a warning.
7. Any unhandled error falls through to `globalErrorHandler`.

### 2.2 Auth service

The auth service uses the same request logging pattern:

1. `requestLoggingMiddleware` logs request start and attaches `x-request-id`.
2. The router processes auth endpoints.
3. `notFoundHandler` returns a 404 if the route is missing.
4. `enhancedErrorHandler` handles Mongoose-specific errors and delegates to `errorHandler`.
5. `errorHandler` logs the error and returns a consistent JSON response.

### 2.3 Mail service

The mail service also follows the same pattern:

1. `requestLoggingMiddleware` logs request details.
2. `notFoundHandler` catches missing endpoints.
3. `globalErrorHandler` logs errors and returns the response.

## 3. Why this setup?

### 3.1 Structured logging

`winston` writes logs in JSON format so logs can be parsed by tools like Elasticsearch / Kibana / Grafana.

Each log entry includes:

- `timestamp`
- `level`
- `service`
- `env`
- `requestId`
- message and optional context metadata

### 3.2 Request correlation

`requestId` is generated in the gateway and propagated to downstream services. This allows tracing a single request across:

- `api-gateway`
- `auth-service`
- `mail-service`

### 3.3 Proxy error handling

If `api-gateway` cannot forward a request to `auth-service`, it logs the proxy failure and returns a meaningful response.
This prevents silent failures and helps operations teams quickly identify service dependencies.

### 3.4 Global error handling

All services now capture unexpected errors in one place. This provides:

- consistent error responses
- logging of stack traces for debugging
- prevention of service crash loops from unhandled errors

## 4. Example logs

### Request start in `api-gateway`

```json
{
    "timestamp": "2026-06-07 10:15:00",
    "level": "info",
    "service": "api-gateway",
    "message": "Incoming request",
    "requestId": "1686124500000-abc123efg",
    "method": "POST",
    "path": "/api/v1/auth/login",
    "ip": "::1"
}
```

### Proxy error in `api-gateway`

```json
{
    "timestamp": "2026-06-07 10:15:05",
    "level": "error",
    "service": "api-gateway",
    "message": "Proxy error",
    "requestId": "1686124500000-abc123efg",
    "stack": "Error: connect ECONNREFUSED 127.0.0.1:3001 ..."
}
```

### Auth service request complete

```json
{
    "timestamp": "2026-06-07 10:15:01",
    "level": "info",
    "service": "auth-service",
    "message": "Request completed",
    "requestId": "1686124500000-abc123efg",
    "method": "POST",
    "path": "/api/v1/auth/login",
    "statusCode": 200,
    "durationMs": 120
}
```

## 5. How to use

### 5.1 Start each service

In each service folder:

```bash
cd api-gateway
npm install
npm run dev
```

```bash
cd auth-service
npm install
npm run dev
```

```bash
cd mail-service
npm install
npm run dev
```

### 5.2 Environment variables

Each service uses the following variables:

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `SERVICE_NAME`

For `auth-service` also:

- `MONGODB_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`

### 5.3 Logs directory

Logs are written to `logs/` in each service folder:

- `logs/error.log`
- `logs/combined.log`

## 6. What a coder should know

### 6.1 If you add a new route

- no need to modify logger code
- just keep throwing `AppError` for known failures
- unhandled exceptions are logged by `globalErrorHandler`

### 6.2 If you add a new service

- copy the logger and middleware pattern
- keep `requestId` propagation if the new service is called from the gateway

### 6.3 If you change proxy headers

- keep `x-request-id` forwarded
- keep only secure headers in proxy requests
- do not leak internal debug information to clients

## 7. Security notes

- In production, do not expose raw stack traces in API responses.
- The gateway and services now return safe messages for 502/500.
- The logs still preserve stack traces internally for debugging.
- Use environment variables for secrets, not hard-coded values.

## 8. Next improvements

After this setup, the next production-ready step is:

1. use a centralized log shipper (Filebeat / Logstash / Fluentd)
2. push logs to Elasticsearch or a log aggregator
3. build Kibana dashboards and alerts based on `requestId`, `service`, `level`, `statusCode`
4. add tracing IDs if you want full distributed trace support
