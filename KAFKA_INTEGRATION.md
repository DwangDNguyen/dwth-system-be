# Kafka Integration Guide - DWth Microservices

## Overview

Kafka has been integrated into the DWth microservices architecture to enable asynchronous event-driven communication between services. This document describes the integration and how to use it.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DWth Microservices Architecture                      │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐         ┌──────────────────┐       ┌──────────────────┐
    │  API Gateway     │         │  Auth Service    │       │  Mail Service    │
    │  (Port 3000)     │         │  (Port 3001)     │       │  (Port 3002)     │
    └────────┬─────────┘         └────────┬─────────┘       └────────┬─────────┘
             │                           │                           │
             │                  ┌────────▼────────┐                  │
             │                  │  Kafka Producer │                  │
             │                  │  (async events) │                  │
             │                  └────────┬────────┘                  │
             │                           │                           │
             ▼                    ┌──────▼──────────┐                │
         ┌─────────────────┐     │  Kafka Topic    │                │
         │  MongoDB        │     │ mail-events     │                │
         │  Redis          │     └──────┬──────────┘                │
         └─────────────────┘            │                           │
                                ┌───────▼────────────┐              │
                                │  Kafka Consumer    │              │
                                │  (async handling)  │              │
                                └───────┬────────────┘              │
                                        │                           │
                                        ▼                           ▼
                                    ┌───────────────────────────────┘
                                    │  HTTP API Call
                                    │  (mail-service/send-mail)
```

## Folder Structure

```
DWth-system/
├── api-gateway/           # API Gateway (unchanged)
├── auth-service/          # Auth Service + Kafka Producer
│   ├── src/
│   │   ├── config/
│   │   │   └── kafka.config.ts      # Kafka producer config
│   │   ├── services/
│   │   │   ├── otp.service.ts       # ✅ Updated: calls Kafka producer
│   │   │   ├── forgot-password.service.ts  # ✅ Updated: calls Kafka producer
│   │   │   └── kafka.mail.producer.ts      # ✅ NEW: Kafka event publisher
│   │   └── server.ts                # ✅ Updated: initializes Kafka producer
│   └── package.json                 # ✅ Updated: added kafkajs
├── mail-service/          # Mail Service + Kafka Consumer
│   ├── src/
│   │   ├── config/
│   │   │   └── kafka.config.ts      # ✅ NEW: Kafka consumer config
│   │   └── server.ts                # ✅ Updated: starts Kafka consumer
│   └── package.json                 # ✅ Updated: added kafkajs
├── kafka-service/         # ✅ NEW: Central Kafka service
│   ├── src/
│   │   ├── config/
│   │   │   └── kafka.config.ts      # Kafka singleton & management
│   │   ├── producers/
│   │   │   ├── base.producer.ts     # Base class for all producers
│   │   │   └── mail.producer.ts     # Mail event producer
│   │   ├── consumers/
│   │   │   ├── base.consumer.ts     # Base class for all consumers
│   │   │   └── mail.consumer.ts     # Mail event consumer
│   │   ├── types/
│   │   │   └── events.ts            # Event types & schemas
│   │   ├── utils/
│   │   │   └── logger.ts            # Winston logger
│   │   └── server.ts                # Kafka consumer server
│   ├── logs/                         # Kafka service logs
│   ├── package.json                 # Kafka dependencies
│   ├── tsconfig.json
│   ├── .env.example
│   └── README.md
└── KAFKA_INTEGRATION.md     # ✅ This file
```

## Event Flow

### 1. User Registration (sendOtp)

```
Client Request
    │
    ▼
POST /api/v1/auth/register
    │
    ▼
auth.controller.register()
    │
    ▼
otp.service.sendOtp()
    │
    ├─────────────────────────────────────────┐
    │                                         │
    ▼ (Primary - Synchronous)              ▼ (Fallback - Async via Kafka)
HTTP POST /api/v1/send-mail         Kafka Producer: SEND_OTP_REGISTRATION
    │                                   │
    ├─ Success ──────────────────────────┤
    │                                   │
    └─ Failure ──────────────────────────▶ Kafka Topic: mail-events
                                            │
                                            ▼
                                    Kafka Consumer (mail-service)
                                            │
                                            ▼
                                    HTTP POST /api/v1/send-mail
                                            │
                                            ▼
                                    Email sent via SMTP
```

### 2. Forgot Password (sendForgotPasswordOtp)

Similar flow to registration:
- Primary: Direct HTTP call to mail-service
- Fallback: Kafka event if HTTP fails

### 3. Password Reset (resetPasswordService)

- Always async via Kafka
- Sends confirmation email after password is changed
- Event: SEND_PASSWORD_RESET_CONFIRMATION

## Dual Delivery Pattern

Auth-service uses a **dual delivery** pattern for reliability:

```
┌─────────────────────────────────────────────────────┐
│ Auth Service - Event Publishing                     │
└─────────────────────────────────────────────────────┘

Event triggered (register, forgot-password, etc.)
    │
    ├──────────────────────┬──────────────────────┐
    │                      │                      │
    ▼                      ▼                      ▼
[Primary Path]      [Fallback Path]         [Logging]
HTTP Direct Call    Kafka Producer          Winston Logger
(5s timeout)        (async, no wait)        (all outcomes)
    │                     │
    ├─ Success ──────────►│
    │                     │ (Not called if HTTP succeeds)
    └─ Failure ──────────►│ (Triggered if HTTP fails)
                          │
                          ▼
                    Kafka Topic: mail-events
                          │
                          ▼
                    Kafka Consumer (mail-service)
                          │
                          ▼
                    HTTP POST /api/v1/send-mail
                          │
                          ▼
                    Email sent
```

**Benefits:**
- ✅ Fast response to client (no wait for async processing)
- ✅ Guaranteed email delivery (HTTP or Kafka)
- ✅ Resilient to temporary mail-service outages
- ✅ Automatic retry via Kafka if HTTP fails
- ✅ Transparent to existing API contracts

## Configuration

### Auth Service (.env)

```env
# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=auth-service
KAFKA_LOG_LEVEL=info

# Topics
MAIL_TOPIC=mail-events
MAIL_FROM_ADDRESS=noreply@dwth.com
```

### Mail Service (.env)

```env
# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=mail-service
MAIL_CONSUMER_GROUP=mail-service-group
MAIL_TOPIC=mail-events
```

### Kafka Service (.env)

```env
# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_CLIENT_ID=kafka-service
KAFKA_LOG_LEVEL=info

# Topics
MAIL_TOPIC=mail-events
MAIL_TOPIC_PARTITIONS=3

# Consumers
MAIL_CONSUMER_GROUP=mail-service-group
```

## Installation & Setup

### 1. Install Kafka

**Option A: Docker (Recommended)**

```bash
# Create docker-compose.yml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

# Start Kafka
docker-compose up -d
```

**Option B: Local Installation**

- Download: [Kafka Downloads](https://kafka.apache.org/downloads)
- Extract and configure as needed
- Start: `bin/kafka-server-start.sh config/server.properties`

### 2. Install Dependencies

```bash
# Auth Service
cd auth-service
npm install

# Mail Service
cd ../mail-service
npm install

# Kafka Service (optional, if running standalone)
cd ../kafka-service
npm install
```

### 3. Setup Environment Files

```bash
# Auth Service
cp auth-service/.env.example auth-service/.env

# Mail Service
cp mail-service/.env.example mail-service/.env

# Kafka Service
cp kafka-service/.env.example kafka-service/.env
```

### 4. Start Services

**Terminal 1 - Auth Service:**
```bash
cd auth-service
npm run dev
```

**Terminal 2 - Mail Service:**
```bash
cd mail-service
npm run dev
```

**Terminal 3 - Kafka Service (optional, if running standalone):**
```bash
cd kafka-service
npm run dev
```

## Testing

### Test Registration with Kafka Fallback

```bash
# 1. Stop mail-service HTTP (or simulate failure)
# 2. Send registration request
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "user"
  }'

# 3. Check logs
# - Auth service: "HTTP mail service unavailable, falling back to Kafka"
# - Kafka consumer (mail-service): "Mail event processed successfully"

# 4. Restart mail-service HTTP
# - Kafka consumer will retry and send email successfully
```

### Monitor Kafka Topics

```bash
# List topics
docker exec kafka kafka-topics --list --bootstrap-server localhost:9092

# Describe mail-events topic
docker exec kafka kafka-topics \
  --describe \
  --topic mail-events \
  --bootstrap-server localhost:9092

# Consume messages (for debugging)
docker exec kafka kafka-console-consumer \
  --topic mail-events \
  --bootstrap-server localhost:9092 \
  --from-beginning \
  --property print.key=true
```

## Monitoring & Troubleshooting

### Check Service Health

```bash
# Auth Service logs
tail -f auth-service/logs/combined.log

# Mail Service logs
tail -f mail-service/logs/combined.log

# Kafka Service logs
tail -f kafka-service/logs/combined.log
```

### Consumer Lag

```bash
# Check consumer group status
docker exec kafka kafka-consumer-groups \
  --bootstrap-server localhost:9092 \
  --group mail-service-group \
  --describe
```

### Common Issues

| Issue | Solution |
|-------|----------|
| **Kafka connection refused** | Check Kafka is running on port 9092 |
| **Topic not created** | Services auto-create on startup |
| **Consumer lag high** | Check mail-service is running, verify network connectivity |
| **Duplicate email sends** | Kafka consumer idempotency is enabled |
| **Events lost** | Check Kafka retention settings, verify consumer committed offsets |

## Performance Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| **Message Publish Latency** | ~10-50ms | Depends on broker latency |
| **Consumer Processing Speed** | 100+ msg/sec | Per partition |
| **Topic Partitions** | 3 | Allows parallel processing |
| **Replication Factor** | 1 | Can be increased for HA |
| **Message Retention** | 7 days | Kafka broker default |

## Security Considerations

- ✅ Unique message IDs prevent duplicates
- ✅ Correlation IDs for tracing across services
- ✅ Structured logging with sensitive data filtering
- ✅ Idempotent consumer to handle retries safely
- ✅ HTTPS recommended for production (TLS in Kafka)

## Future Enhancements

- [ ] Schema Registry for event validation
- [ ] Dead Letter Queue (DLQ) for failed messages
- [ ] Message encryption at rest
- [ ] Prometheus metrics export
- [ ] Circuit breaker pattern
- [ ] Event deduplication service
- [ ] Admin API dashboard
- [ ] Multi-region replication

## References

- [KafkaJS Documentation](https://kafka.js.org/)
- [Kafka Best Practices](https://kafka.apache.org/documentation/)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Microservices Patterns](https://microservices.io/patterns/data/event-driven-architecture.html)

## Support

For issues or questions:
1. Check service logs: `logs/combined.log` and `logs/error.log`
2. Verify Kafka connectivity: `telnet localhost 9092`
3. Check consumer group status: Kafka admin tools
4. Review correlation IDs in logs for request tracing
