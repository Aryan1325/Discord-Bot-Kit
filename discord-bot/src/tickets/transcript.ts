import type { Message, TextChannel } from "discord.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Fetches up to `limit` messages from a channel, oldest first. */
export async function fetchTranscriptMessages(channel: TextChannel, limit = 500): Promise<Message[]> {
  const collected: Message[] = [];
  let beforeId: string | undefined;

  while (collected.length < limit) {
    const batch = await channel.messages.fetch({ limit: Math.min(100, limit - collected.length), before: beforeId });
    if (batch.size === 0) break;

    collected.push(...batch.values());
    beforeId = batch.last()?.id;

    if (batch.size < 100) break;
  }

  return collected.reverse();
}

/** Renders a self-contained, dark-themed HTML transcript for a ticket channel. */
export function generateTranscriptHtml(channelName: string, messages: Message[]): string {
  const rows = messages
    .map((message) => {
      const author = escapeHtml(message.author?.tag ?? "Unknown User");
      const avatar = message.author?.displayAvatarURL({ size: 64 }) ?? "";
      const timestamp = new Date(message.createdTimestamp).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      const content = message.content ? escapeHtml(message.content).replace(/\n/g, "<br>") : "<em>(no text content)</em>";

      const attachments = [...message.attachments.values()]
        .map((attachment) => `<div class="attachment"><a href="${attachment.url}" target="_blank">${escapeHtml(attachment.name)}</a></div>`)
        .join("");

      const embeds = message.embeds
        .map((embed) => {
          const title = embed.title ? `<div class="embed-title">${escapeHtml(embed.title)}</div>` : "";
          const description = embed.description ? `<div class="embed-desc">${escapeHtml(embed.description).replace(/\n/g, "<br>")}</div>` : "";
          return `<div class="embed">${title}${description}</div>`;
        })
        .join("");

      return `
        <div class="message">
          <img class="avatar" src="${avatar}" alt="${author}" />
          <div class="body">
            <div class="meta"><span class="author">${author}</span> <span class="time">${timestamp}</span></div>
            <div class="content">${content}</div>
            ${attachments}
            ${embeds}
          </div>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Transcript — ${escapeHtml(channelName)}</title>
<style>
  body { background: #0b0e14; color: #e6e6e6; font-family: "Segoe UI", Helvetica, Arial, sans-serif; margin: 0; padding: 24px; }
  h1 { color: #00e5ff; font-size: 20px; margin-bottom: 4px; }
  .subtitle { color: #8a8f98; margin-bottom: 24px; font-size: 13px; }
  .message { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #1b1f27; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; background: #1b1f27; }
  .meta { font-size: 13px; margin-bottom: 4px; }
  .author { color: #00e5ff; font-weight: 600; }
  .time { color: #6b7280; margin-left: 8px; font-size: 12px; }
  .content { font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .attachment, .embed { margin-top: 6px; padding: 8px 10px; background: #11151c; border-left: 3px solid #00e5ff; border-radius: 4px; font-size: 13px; }
  .attachment a { color: #00e5ff; text-decoration: none; }
  .embed-title { font-weight: 600; color: #ffffff; margin-bottom: 4px; }
  .embed-desc { color: #cbd5e1; }
  footer { margin-top: 24px; color: #4b5563; font-size: 12px; text-align: center; }
</style>
</head>
<body>
  <h1>🎫 Ticket Transcript — #${escapeHtml(channelName)}</h1>
  <div class="subtitle">Generated ${new Date().toLocaleString("en-US")} • AK ESPORTS • Powered by AK</div>
  ${rows || '<div class="subtitle">No messages were found in this ticket.</div>'}
  <footer>AK ESPORTS • Powered by AK</footer>
</body>
</html>`;
}
