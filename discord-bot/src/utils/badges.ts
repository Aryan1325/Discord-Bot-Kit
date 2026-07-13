import { UserFlagsBitField } from "discord.js";

/** Maps Discord public user-flag names to a friendly display label. */
const BADGE_LABELS: Partial<Record<ReturnType<UserFlagsBitField["toArray"]>[number], string>> = {
  Staff: "Discord Staff",
  Partner: "Discord Partner",
  Hypesquad: "HypeSquad Events",
  BugHunterLevel1: "Bug Hunter",
  BugHunterLevel2: "Bug Hunter (Gold)",
  HypeSquadOnlineHouse1: "HypeSquad Bravery",
  HypeSquadOnlineHouse2: "HypeSquad Brilliance",
  HypeSquadOnlineHouse3: "HypeSquad Balance",
  PremiumEarlySupporter: "Early Supporter",
  VerifiedDeveloper: "Early Verified Bot Developer",
  CertifiedModerator: "Discord Certified Moderator",
  VerifiedBot: "Verified Bot",
  ActiveDeveloper: "Active Developer",
};

/** Converts a user's public flags into a readable list of badge names. */
export function getBadgeLabels(flags: UserFlagsBitField | null | undefined): string[] {
  if (!flags) {
    return [];
  }
  return flags.toArray().map((flag) => BADGE_LABELS[flag] ?? flag);
}
