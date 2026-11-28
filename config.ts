import {
  AttachmentBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../types/index.js";
import { createEmbed, createErrorEmbed, createSuccessEmbed } from "../embeds/embedBuilder.js";
import { createButtonRow } from "../embeds/components.js";
import { getFullGuildConfig, importGuildConfig, resetGuildConfig, type FullGuildConfig } from "../database/repositories.js";
import { getCachedGuildConfig, invalidateGuildCache } from "../cache/settingsCache.js";
import { DatabaseError } from "../errors/BotError.js";
import { ensureMemberPermission } from "../utils/permissions.js";
import { sanitizeGuildConfig } from "../config/importValidation.js";
import { ChannelType } from "discord.js";
import { validateAssignableRole } from "../utils/validation.js";

const MAX_IMPORT_BYTES = 256 * 1024;
const ALLOWED_ATTACHMENT_HOSTS = ["cdn.discordapp.com", "media.discordapp.net"];

function formatBool(value: boolean | undefined): string {
  return value ? "Enabled" : "Disabled";
}

function buildConfigOverviewEmbed(client: Parameters<typeof createEmbed>[0]["client"], guildName: string, config: FullGuildConfig) {
  return createEmbed({
    client,
    title: `Server Configuration — ${guildName}`,
    description: "Current settings stored for this server. Use `/config export` for the full raw JSON.",
    fields: [
      {
        name: "Welcome",
        value: config.welcome
          ? `${formatBool(config.welcome.enabled)} • Channel: ${config.welcome.channelId ? `<#${config.welcome.channelId}>` : "Not set"}`
          : "Not configured",
      },
      {
        name: "Goodbye",
        value: config.goodbye
          ? `${formatBool(config.goodbye.enabled)} • Channel: ${config.goodbye.channelId ? `<#${config.goodbye.channelId}>` : "Not set"}`
          : "Not configured",
      },
      {
        name: "Verification",
        value: config.verification
          ? `${formatBool(config.verification.enabled)} • Channel: ${config.verification.channelId ? `<#${config.verification.channelId}>` : "Not set"} • Role: ${config.verification.roleId ? `<@&${config.verification.roleId}>` : "Not set"}`
          : "Not configured",
      },
      {
        name: "Tickets",
        value: config.tickets
          ? `${formatBool(config.tickets.enabled)} • Category: ${config.tickets.categoryId ?? "Not set"} • Support Role: ${config.tickets.supportRoleId ? `<@&${config.tickets.supportRoleId}>` : "Not set"}`
          : "Not configured",
      },
      {
        name: "Logging",
        value: config.logging
          ? `Channel: ${config.logging.channelId ? `<#${config.logging.channelId}>` : "Not set"} • Events enabled: ${config.logging.enabledEvents.length}`
          : "Not configured",
      },
    ],
  });
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("View, reset, export, or import this server's configuration.")
    .addSubcommand((sub) => sub.setName("view").setDescription("Display the current server configuration."))
    .addSubcommand((sub) => sub.setName("reset").setDescription("Reset this server's configuration (requires confirmation)."))
    .addSubcommand((sub) => sub.setName("export").setDescription("Export the current configuration as a JSON file."))
    .addSubcommand((sub) =>
      sub
        .setName("import")
        .setDescription("Import a configuration JSON file exported with /config export.")
        .addAttachmentOption((option) => option.setName("file").setDescription("The exported config JSON file.").setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used inside a server.", flags: MessageFlags.Ephemeral });
      return;
    }

    if (!(await ensureMemberPermission(interaction, PermissionFlagsBits.ManageGuild, "Manage Server"))) return;

    const subcommand = interaction.options.getSubcommand(true);
    const guildId = interaction.guild.id;

    if (subcommand === "view") {
      const config = getCachedGuildConfig(guildId);
      const embed = buildConfigOverviewEmbed(interaction.client, interaction.guild.name, config);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === "export") {
      const config = getFullGuildConfig(guildId);
      const json = JSON.stringify(config, null, 2);
      const attachment = new AttachmentBuilder(Buffer.from(json, "utf-8"), {
        name: `ak-esports-config-${guildId}.json`,
      });

      const embed = createEmbed({
        client: interaction.client,
        title: "Configuration Exported",
        description: "Here is the current configuration for this server, as JSON.",
      });

      await interaction.reply({ embeds: [embed], files: [attachment], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === "import") {
      const file = interaction.options.getAttachment("file", true);

      if (!file.name?.toLowerCase().endsWith(".json") && file.contentType && !file.contentType.includes("json")) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "That file doesn't look like a JSON config export. Please attach a `.json` file.")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Hard limits: a config export is a few KB. Reject anything big before downloading it.
      if (file.size > MAX_IMPORT_BYTES) {
        await interaction.reply({
          embeds: [createErrorEmbed(interaction.client, "That file is too large to be a config export (limit 256 KB).")],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      let host = "";
      try { host = new URL(file.url).hostname; } catch { /* handled below */ }
      if (!ALLOWED_ATTACHMENT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        await interaction.reply({ embeds: [createErrorEmbed(interaction.client, "That attachment isn't hosted on Discord, so I won't download it.")], flags: MessageFlags.Ephemeral });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const response = await fetch(file.url);
        if (!response.ok) {
          throw new DatabaseError(`Failed to download the attached config file (HTTP ${response.status}).`);
        }

        const text = await response.text();
        let parsed: Partial<FullGuildConfig>;
        try {
          parsed = JSON.parse(text);
        } catch {
          await interaction.editReply({
            embeds: [createErrorEmbed(interaction.client, "That file isn't valid JSON — please attach an unmodified export from `/config export`.")],
          });
          return;
        }

        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          await interaction.editReply({
            embeds: [createErrorEmbed(interaction.client, "That JSON doesn't match the expected configuration shape.")],
          });
          return;
        }

        // Never trust the file: every channel/role must exist in THIS server, text is length-capped.
        const guild = interaction.guild;
        const { config: safe, notes } = sanitizeGuildConfig(parsed, {
          isTextChannel: (id) => {
            const c = guild.channels.cache.get(id);
            return Boolean(c && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement));
          },
          isCategory: (id) => guild.channels.cache.get(id)?.type === ChannelType.GuildCategory,
          isAssignableRoleId: (id) => {
            const role = guild.roles.cache.get(id);
            return Boolean(role && role.id !== guild.id && !role.managed);
          },
        });
        if (Object.keys(safe).length === 0) {
          await interaction.editReply({ embeds: [createErrorEmbed(interaction.client, notes.join("\n") || "Nothing importable was found in that file.")] });
          return;
        }

        // Auto-role / verification roles must also be safe to hand out automatically.
        const welcome = safe.welcome as { autoRoleId: string | null } | undefined;
        if (welcome?.autoRoleId && !validateAssignableRole(guild, guild.roles.cache.get(welcome.autoRoleId), { rejectPrivileged: true }).ok) {
          welcome.autoRoleId = null;
          notes.push("welcome.autoRoleId: role isn't safe or possible for me to assign automatically — cleared.");
        }
        const verification = safe.verification as { enabled: boolean; roleId: string | null } | undefined;
        if (verification?.roleId && !validateAssignableRole(guild, guild.roles.cache.get(verification.roleId), { rejectPrivileged: true }).ok) {
          verification.roleId = null;
          verification.enabled = false;
          notes.push("verification: role isn't safe or possible for me to assign — verification disabled.");
        }

        importGuildConfig(guildId, safe as Partial<FullGuildConfig>);
        invalidateGuildCache(guildId);

        const summary = notes.length ? `\n\n**Adjusted during import:**\n${notes.slice(0, 10).map((n) => `• ${n}`).join("\n")}` : "";
        await interaction.editReply({
          embeds: [createSuccessEmbed(interaction.client, `Configuration imported. Run \`/config view\` to confirm the new settings.${summary}`)],
        });
      } catch (error) {
        throw error instanceof Error ? error : new DatabaseError("Unknown error while importing configuration.");
      }
      return;
    }

    if (subcommand === "reset") {
      const embed = createEmbed({
        client: interaction.client,
        title: "Reset Server Configuration?",
        description:
          "This will permanently delete **all** stored settings for this server — welcome/goodbye messages, verification, tickets, logging, reaction roles, warnings, levels, giveaways, and suggestions. This cannot be undone.",
        color: 0xed4245,
      });

      const rows = [
        createButtonRow([
          { customId: "config:reset:confirm", label: "Confirm Reset", style: ButtonStyle.Danger, emoji: "⚠️" },
          { customId: "config:reset:cancel", label: "Cancel", style: ButtonStyle.Secondary },
        ]),
      ];

      const message = await interaction.reply({
        embeds: [embed],
        components: rows,
        flags: MessageFlags.Ephemeral,
        withResponse: true,
      });

      const reply = message.resource?.message ?? (await interaction.fetchReply());

      try {
        const buttonInteraction = await reply.awaitMessageComponent({
          componentType: ComponentType.Button,
          filter: (i) => i.user.id === interaction.user.id,
          time: 30_000,
        });

        if (buttonInteraction.customId === "config:reset:confirm") {
          resetGuildConfig(guildId);
          invalidateGuildCache(guildId);
          await buttonInteraction.update({
            embeds: [createSuccessEmbed(interaction.client, "This server's configuration has been reset to defaults.")],
            components: [],
          });
        } else {
          await buttonInteraction.update({
            embeds: [createEmbed({ client: interaction.client, title: "Reset Cancelled", description: "No changes were made." })],
            components: [],
          });
        }
      } catch {
        await interaction.editReply({
          embeds: [createEmbed({ client: interaction.client, title: "Reset Timed Out", description: "No response received — no changes were made." })],
          components: [],
        });
      }
    }
  },
};
