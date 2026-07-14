import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { Guild, GuildMember } from "discord.js";

const WIDTH = 1000;
const HEIGHT = 420;

function drawRoundedRect(ctx: SKRSContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawBackground(ctx: SKRSContext2D, kind: "join" | "leave"): void {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  if (kind === "join") {
    gradient.addColorStop(0, "#04121a");
    gradient.addColorStop(0.55, "#062430");
    gradient.addColorStop(1, "#00e5ff");
  } else {
    gradient.addColorStop(0, "#12040a");
    gradient.addColorStop(0.55, "#2a0d16");
    gradient.addColorStop(1, "#ed4245");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle diagonal accent stripes for a "premium" feel.
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 40;
  for (let x = -HEIGHT; x < WIDTH + HEIGHT; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + HEIGHT, HEIGHT);
    ctx.stroke();
  }
  ctx.restore();

  // Darkened panel behind the text/avatar for contrast.
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#000000";
  drawRoundedRect(ctx, 0, 0, WIDTH, HEIGHT, 0);
  ctx.fill();
  ctx.restore();
}

/**
 * Renders a Sapphire/ProBot-style welcome or goodbye card to a PNG buffer:
 * gradient background, circular user avatar, server icon badge, username,
 * and live member count.
 */
export async function generateMemberCard(member: GuildMember, guild: Guild, kind: "join" | "leave"): Promise<Buffer> {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, kind);

  // Outer card border.
  ctx.save();
  ctx.strokeStyle = kind === "join" ? "#00e5ff" : "#ed4245";
  ctx.lineWidth = 6;
  drawRoundedRect(ctx, 10, 10, WIDTH - 20, HEIGHT - 20, 24);
  ctx.stroke();
  ctx.restore();

  // Avatar (circular, centered horizontally, upper-middle).
  const avatarSize = 176;
  const avatarX = WIDTH / 2 - avatarSize / 2;
  const avatarY = 56;

  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const avatarImage = await loadImage(avatarUrl);

    ctx.save();
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2 + 8, 0, Math.PI * 2);
    ctx.fillStyle = kind === "join" ? "#00e5ff" : "#ed4245";
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImage, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } catch {
    // If the avatar fails to load, continue rendering the rest of the card.
  }

  // Server icon badge (bottom-right of the avatar).
  try {
    const iconUrl = guild.iconURL({ extension: "png", size: 128 });
    if (iconUrl) {
      const iconImage = await loadImage(iconUrl);
      const iconSize = 56;
      const iconX = WIDTH / 2 + avatarSize / 2 - iconSize + 14;
      const iconY = avatarY + avatarSize - iconSize + 14;

      ctx.save();
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = "#0b0e14";
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(iconImage, iconX, iconY, iconSize, iconSize);
      ctx.restore();
    }
  } catch {
    // Non-fatal — server may not have a custom icon.
  }

  // Headline text.
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 46px sans-serif";
  ctx.fillText(kind === "join" ? "WELCOME" : "GOODBYE", WIDTH / 2, 280);

  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = kind === "join" ? "#00e5ff" : "#ff8a8d";
  const username = member.user.username.length > 24 ? `${member.user.username.slice(0, 21)}...` : member.user.username;
  ctx.fillText(username, WIDTH / 2, 326);

  ctx.font = "26px sans-serif";
  ctx.fillStyle = "#d0d6dd";
  const countText =
    kind === "join"
      ? `You are member #${guild.memberCount} of ${guild.name}`
      : `${guild.name} now has ${guild.memberCount} member(s)`;
  ctx.fillText(countText, WIDTH / 2, 366);

  return canvas.encode("png");
}
