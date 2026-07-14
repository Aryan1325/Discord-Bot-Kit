import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import { createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { createEmbed } from "../embeds/embedBuilder.js";
import { DatabaseError, PermissionError } from "../errors/BotError.js";
import { logError } from "../errors/errorHandler.js";
import { isTicketType } from "./types.js";
import {
  addUserToTicket,
  closeTicket,
  deleteTicket,
  generateAndDeliverTranscript,
  openTicket,
  removeUserFromTicket,
  reopenTicket,
  requireTicketChannel,
} from "./ticketService.js";

const ADD_USER_MODAL_ID = "ticket:modal:adduser";
const REMOVE_USER_MODAL_ID = "ticket:modal:removeuser";
const USER_INPUT_ID = "ticket:modal:userinput";

/** Extracts a snowflake from a raw mention (`<@123>` / `<@!123>`) or a bare ID string. */
function extractUserId(raw: string): string | null {
  const trimmed = raw.trim();
  const mentionMatch = trimmed.match(/^<@!?(\d+)>$/);
  if (mentionMatch) return mentionMatch[1];
  if (/^\d{15,25}$/.test(trimmed)) return trimmed;
  return null;
}

/** Routes any button interaction whose customId starts with `ticket:`. */
export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const { customId } = interaction;

  try {
    if (customId.startsWith("ticket:open:")) {
      await handleOpenButton(interaction);
      return;
    }

    switch (customId) {
      case "ticket:close":
        await handleCloseButton(interaction);
        return;
      case "ticket:reopen":
        await handleReopenButton(interaction);
        return;
      case "ticket:delete":
        await handleDeleteButton(interaction);
        return;
      case "ticket:transcript":
        await handleTranscriptButton(interaction);
        return;
      case "ticket:adduser":
        await showUserModal(interaction, ADD_USER_MODAL_ID, "Add User to Ticket");
        return;
      case "ticket:removeuser":
        await showUserModal(interaction, REMOVE_USER_MODAL_ID, "Remove User from Ticket");
        return;
      default:
        logError("TICKET_BUTTON", `Unknown ticket button customId: ${customId}`);
    }
  } catch (error) {
    await deliverTicketError(interaction, error);
  }
}

/** Routes any modal submission whose customId starts with `ticket:`. */
export async function handleTicketModal(interaction: ModalSubmitInteraction): Promise<void> {
  try {
    if (interaction.customId === ADD_USER_MODAL_ID || interaction.customId === REMOVE_USER_MODAL_ID) {
      await handleUserModalSubmit(interaction);
      return;
    }
    logError("TICKET_MODAL", `Unknown ticket modal customId: ${interaction.customId}`);
  } catch (error) {
    await deliverTicketError(interaction, error);
  }
}

async function deliverTicketError(interaction: ButtonInteraction | ModalSubmitInteraction, error: unknown): Promise<void> {
  logError("TICKET_INTERACTION", error);

  const message =
    error instanceof PermissionError
      ? error.message
      : error instanceof DatabaseError
        ? error.message
        : "Something went wrong handling that ticket action. It's been logged — please try again.";

  const embed = createErrorEmbed(interaction.client, message);
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  } catch (deliveryError) {
    logError("TICKET_ERROR_DELIVERY", deliveryError);
  }
}

async function handleOpenButton(interaction: ButtonInteraction): Promise<void> {
  const type = interaction.customId.replace("ticket:open:", "");
  if (!isTicketType(type)) {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "Unknown ticket category.")], flags: MessageFlags.Ephemeral });
    return;
  }
  if (!interaction.guild) {
    await interaction.reply({ content: "This can only be used inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const member = await interaction.guild.members.fetch(interaction.user.id);
  const { channel } = await openTicket(interaction.guild, member, type);

  await interaction.editReply({
    embeds: [createSuccessEmbed(interaction.client, `Your ticket has been created: ${channel}`)],
  });
}

async function handleCloseButton(interaction: ButtonInteraction): Promise<void> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return;
  if (ticket.status === "closed") {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "This ticket is already closed.")], flags: MessageFlags.Ephemeral });
    return;
  }
  await closeTicket(interaction.channel as TextChannel, ticket, interaction.user.id);
  await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Ticket closed.")], flags: MessageFlags.Ephemeral });
}

async function handleReopenButton(interaction: ButtonInteraction): Promise<void> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return;
  if (ticket.status === "open") {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "This ticket is already open.")], flags: MessageFlags.Ephemeral });
    return;
  }
  await reopenTicket(interaction.channel as TextChannel, ticket, interaction.user.id);
  await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, "Ticket reopened.")], flags: MessageFlags.Ephemeral });
}

async function handleDeleteButton(interaction: ButtonInteraction): Promise<void> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return;

  const confirmEmbed = createEmbed({
    client: interaction.client,
    title: "🗑 Delete This Ticket?",
    description: "This will permanently delete the channel. This cannot be undone.",
    color: 0xed4245,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:delete:confirm").setLabel("Confirm Delete").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ticket:delete:cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
  );

  const message = await interaction.reply({ embeds: [confirmEmbed], components: [row], flags: MessageFlags.Ephemeral, withResponse: true });
  const reply = message.resource?.message ?? (await interaction.fetchReply());

  try {
    const confirmation = await reply.awaitMessageComponent({
      componentType: ComponentType.Button,
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
    });

    if (confirmation.customId === "ticket:delete:confirm") {
      await confirmation.update({ embeds: [createSuccessEmbed(interaction.client, "Deleting this ticket...")], components: [] });
      await deleteTicket(interaction.channel as TextChannel, ticket, interaction.user.id);
    } else {
      await confirmation.update({ embeds: [createEmbed({ client: interaction.client, title: "Cancelled", description: "No changes were made." })], components: [] });
    }
  } catch {
    await interaction.editReply({ embeds: [createEmbed({ client: interaction.client, title: "Timed Out", description: "No response — no changes were made." })], components: [] }).catch(() => undefined);
  }
}

async function handleTranscriptButton(interaction: ButtonInteraction): Promise<void> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const result = await generateAndDeliverTranscript(interaction.channel as TextChannel, ticket, interaction.user.id);
  const parts = [result.deliveredToChannel ? "sent to the transcript channel" : null, result.deliveredToDm ? "DMed to the ticket owner" : null].filter(Boolean);

  await interaction.editReply({
    embeds: [createSuccessEmbed(interaction.client, parts.length > 0 ? `Transcript generated and ${parts.join(" and ")}.` : "Transcript generated (attached below).")],
    files: parts.length > 0 ? [] : [result.attachment],
  });
}

async function showUserModal(interaction: ButtonInteraction, modalId: string, title: string): Promise<void> {
  const ticket = await requireTicketChannel(interaction);
  if (!ticket) return;

  const modal = new ModalBuilder().setCustomId(modalId).setTitle(title);
  const input = new TextInputBuilder()
    .setCustomId(USER_INPUT_ID)
    .setLabel("User ID or @mention")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. 123456789012345678 or @username")
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
  await interaction.showModal(modal);
}

async function handleUserModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This can only be used inside a server.", flags: MessageFlags.Ephemeral });
    return;
  }

  const ticket = await requireTicketChannel(interaction as never);
  if (!ticket) return;

  const raw = interaction.fields.getTextInputValue(USER_INPUT_ID);
  const userId = extractUserId(raw);
  if (!userId) {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "That doesn't look like a valid user ID or mention.")], flags: MessageFlags.Ephemeral });
    return;
  }

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member) {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "Couldn't find that member in this server.")], flags: MessageFlags.Ephemeral });
    return;
  }

  const channel = interaction.channel as TextChannel;

  if (interaction.customId === ADD_USER_MODAL_ID) {
    await addUserToTicket(channel, ticket, member, interaction.user.id);
    await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, `${member.user} was added to this ticket.`)] });
    return;
  }

  if (member.id === ticket.ownerId) {
    await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "You can't remove the ticket owner. Use the Delete button instead.")], flags: MessageFlags.Ephemeral });
    return;
  }

  await removeUserFromTicket(channel, ticket, member, interaction.user.id);
  await interaction.reply({ embeds: [createSuccessEmbed(interaction.client, `${member.user} was removed from this ticket.`)] });
}
