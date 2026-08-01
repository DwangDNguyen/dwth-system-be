import { EachMessagePayload } from "kafkajs";
import logger from "../utils/logger";
import axios from "axios";

/**
 * Handle mail event message
 */
export async function handleMailMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    const messageId = message.headers?.["correlation-id"]?.toString() || "unknown";

    try {
        const parsedValue = message.value
            ? JSON.parse(message.value.toString())
            : null;

        if (!parsedValue) {
            throw new Error("Failed to parse message value");
        }

        // Extract mail data from event
        const mailData = {
            from: parsedValue.from || process.env.MAIL_FROM_ADDRESS || "noreply@dwth.com",
            email: parsedValue.email,
            subject: parsedValue.subject,
            body: parsedValue.body,
        };

        logger.debug("Processing mail event", {
            messageId,
            email: mailData.email,
            eventType: parsedValue.type,
        });

        // Send email
        const response = await axios.post(
            "http://localhost:3002/api/v1/send-mail",
            mailData,
            {
                headers: {
                    "Content-Type": "application/json",
                    "X-Message-ID": messageId,
                },
                timeout: 10000,
            },
        );

        logger.info("Mail event processed successfully", {
            messageId,
            email: mailData.email,
            eventType: parsedValue.type,
            response: response.status,
        });
    } catch (error) {
        logger.error("Error processing mail event", {
            messageId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error; // Trigger Kafka error handling for retry
    }
}
