import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { createErrorEmbed } from "../embeds/embedBuilder.js";
import { DatabaseError, PermissionError } from "./BotError.js";

/**
 * The single global error handler for the bot. Every catch block — command
 * execution, interaction routing, process-level rejections — should route
 * through here so errors are logged consistently and, where possible,
 * surfaced to the user as a branded embed instead of a silent failure or
 * a crash.
 */

/** Picks a user-facing message based on the error category, without leaking internals. */
function describeError(error: unknown): string {
  if (error instanceof DatabaseError) {
    return "A database error occurred while handling that command. It's been logged — please try again in a moment.";
  }
  if (error instanceof PermissionError) {
    return error.message;
  }
  if (error instanceof Error) {
    return "This command hit an unexpected error. It's been logged — please try again in a moment.";
  }
  return "An unknown error occurred. It's been logged — please try again in a moment.";
}

/** Structured console logging so errors are easy to grep for by category. */
export function logError(scope: string, error: unknown): void {
  const label = error instanceof Error ? error.name : "UnknownError";
  console.error(`[ERROR][${scope}][${label}]`, error);
}

/**
 * Handles an error thrown while executing a slash command interaction.
 * Always attempts to notify the user with a branded error embed and never
 * throws — a failure to deliver the embed is logged instead of propagated.
 */
export async function handleInteractionError(interaction: ChatInputCommandInteraction, error: unknown, scope = "COMMAND"): Promise<void> {
  logError(`${scope}:${interaction.commandName}`, error);

  const embed = createErrorEmbed(interaction.client, describeError(error));

  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (deliveryError) {
    logError("ERROR_DELIVERY", deliveryError);
  }
}

/** Installs process-wide safety nets so the bot never crashes on an unhandled error. */
export function installGlobalErrorHandlers(): void {
  process.on("unhandledRejection", (error) => {
    logError("UNHANDLED_REJECTION", error);
  });

  process.on("uncaughtException", (error) => {
    logError("UNCAUGHT_EXCEPTION", error);
  });
}
