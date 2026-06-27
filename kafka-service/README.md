# Kafka Service

Event streaming service using Apache Kafka for asynchronous communication in the DWth microservices architecture.

## Overview

The Kafka Service is responsible for:

- **Event Production**: Microservices publish events (registration, password reset, etc.) to Kafka topics
- **Event Consumption**: Services subscribe to events and process them asynchronously
- **Message Reliability**: Guaranteed message delivery with idempotent producer and consumer group management
- **Centralized Configuration**: Shared Kafka configuration and client lifecycle management

## Architecture

### Components

#### 1. Configuration (`config/kafka.config.ts`)

- **Singleton Pattern**: Manages single Kafka instance across the application
- **Automatic Topic Creation**: Ensures topics exist before publishing/consuming
- **Graceful Shutdown**: Handles cleanup on SIGTERM/SIGINT
- **Retry Logic**: Built-in exponential backoff for connection failures

#### 2. Producers (`producers/`)

- **BaseProducer**: Abstract base class with common publishing logic
  - Message ID generation for idempotency
  - Batch message sending
  - Error handling and logging

- **MailProducer**: Sends mail-related events
  - `sendOtpRegistration()`: Send OTP for user registration
  - `sendOtpForgotPassword()`: Send OTP for password recovery
  - `sendPasswordResetConfirmation()`: Send password reset confirmation

#### 3. Consumers (`consumers/`)

- **BaseConsumer**: Abstract base class with common consumption logic
  - Topic subscription and message handling
  - Error recovery and logging
  - Safe JSON parsing

- **MailConsumer**: Consumes mail events and sends HTTP requests to mail-service
  - Processes OTP events
  - Handles password reset confirmations
  - Implements exponential backoff on failures

#### 4. Event Types (`types/events.ts`)

Strongly-typed event definitions:

```typescript
// Mail Events
- SEND_OTP_REGISTRATION
- SEND_OTP_FORGOT_PASSWORD
- SEND_PASSWORD_RESET_CONFIRMATION

// Auth Events (extensible)
- USER_REGISTERED
- USER_LOGGED_IN
- USER_LOGGED_OUT
- PASSWORD_RESET
```

## Topics and Partitioning

### mail-events

- **Purpose**: Email sending events
- **Partitions**: 3 (default, configurable)
- **Replication Factor**: 1
- **Consumers**: mail-service
- **Retention**: 7 days (Kafka broker default)

## Setup

### Installation

1. Install dependencies:

```bash
npm install
```

2. Build TypeScript:

```bash
npm run build
```

3. Create `.env` file (see `.env.example`):

```bash
cp .env.example .env
```

### Environment Variables

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

# Services
MAIL_SERVICE_URL=http://localhost:3002/api/v1/send-mail

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Running

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Integration with Other Services

### Auth Service

The auth-service publishes mail events when:

1. **User Registration**
   - Publishes: `SEND_OTP_REGISTRATION`
   - Topic: `mail-events`

2. **Forgot Password**
   - Publishes: `SEND_OTP_FORGOT_PASSWORD`
   - Topic: `mail-events`

3. **Reset Password**
   - Publishes: `SEND_PASSWORD_RESET_CONFIRMATION`
   - Topic: `mail-events`

### Mail Service

The mail-service has two consumer modes:

1. **HTTP Endpoint** (Synchronous)
   - Route: `POST /api/v1/send-mail`
   - Direct request from other services

2. **Kafka Consumer** (Asynchronous)
   - Consumes: `mail-events` topic
   - Group: `mail-service-group`
   - Processes mail events with retry logic

## Performance Characteristics

- **Producer**: ~10-50ms per message (depending on broker latency)
- **Consumer**: Processes 100+ messages/sec per partition
- **Partitions**: 3 partitions for parallel processing
- **Batch Size**: Configurable, default 16KB
- **Compression**: Snappy (configurable in future)

## Security Features

- **Message Validation**: JSON schema validation for events
- **Idempotent Producer**: Prevents duplicate message processing
- **Unique Message IDs**: Track messages for debugging
- **Error Handling**: Structured error logging with correlation IDs
- **Consumer Offsets**: Kafka manages offset commits automatically

## Monitoring and Logging

All components use Winston logger with:

- **Structured Logging**: JSON format for parsing
- **Log Levels**: debug, info, warn, error
- **File Rotation**: Automatic log file rotation (5MB max)
- **Console Output**: Pretty-printed in development

Log files:
- `logs/combined.log`: All logs
- `logs/error.log`: Error logs only

## Troubleshooting

### Connection Issues

```bash
# Check Kafka broker is running
telnet localhost 9092

# View Kafka logs
docker logs kafka-container

# Check broker connectivity
npx kafkajs-admin list-topics --broker localhost:9092
```

### Consumer Lag

```bash
# Check consumer group lag
docker exec kafka-container kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group mail-service-group \
  --describe
```

### Message Loss

- Enable idempotent producer (done by default)
- Verify replication factor matches setup
- Check consumer offset commits

## Future Enhancements

- [ ] Schema Registry integration (Avro/Protobuf)
- [ ] Dead Letter Queue (DLQ) for failed messages
- [ ] Message encryption
- [ ] Prometheus metrics export
- [ ] Circuit breaker pattern for HTTP consumer calls
- [ ] Message deduplication store
- [ ] Admin API for topic management
- [ ] Health check endpoint

## References

- [KafkaJS Documentation](https://kafka.js.org/)
- [Kafka Best Practices](https://kafka.apache.org/documentation/#bestpractices)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
