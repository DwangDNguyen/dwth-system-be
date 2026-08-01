import { EachMessagePayload } from "kafkajs";
import logger from "../utils/logger";
import { createUserProfile } from "../services/user.service";

/**
 * Handle user event message
 */
export async function handleUserMessage(payload: EachMessagePayload): Promise<void> {
    const { message } = payload;
    const messageId = message.headers?.["correlation-id"]?.toString() || "unknown";

    try {
        const parsedValue = message.value
            ? JSON.parse(message.value.toString())
            : null;

        if (!parsedValue) {
            throw new Error("Failed to parse user event message value");
        }

        logger.debug("Received user event message", {
            messageId,
            type: parsedValue.type,
            authUserId: parsedValue.authUserId,
        });

        // Handle user.created event
        if (parsedValue.type === "user.created") {
            const { authUserId, fullname, email, role } = parsedValue;
            
            await createUserProfile({
                authUserId,
                fullName: fullname,
                email,
                role,
            });

            logger.info("Processed user.created event successfully", {
                messageId,
                authUserId,
                email,
            });
        } else {
            logger.warn("Received unknown event type", {
                messageId,
                type: parsedValue.type,
            });
        }
    } catch (error) {
        logger.error("Error processing user event message", {
            messageId,
            error: error instanceof Error ? error.message : String(error),
        });
        throw error; // Propagate error for Kafkajs retry/commit strategies
    }
}
