/**
 * Central branding + configuration for AK ESPORTS.
 * Change values here to re-brand the whole bot at once.
 */
export const botConfig = {
  name: "AK ESPORTS",
  developer: "AK",
  version: "1.0.0",
  supportServerUrl: undefined as string | undefined,

  colors: {
    primary: 0x00e5ff, // Cyan
    black: 0x000000,
    success: 0x2ecc71,
    error: 0xed4245,
    warning: 0xfee75c,
  },

  footer: {
    text: "AK ESPORTS • Powered by AK",
  },
} as const;
