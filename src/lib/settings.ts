import * as z from "zod/mini";

// Ensure this aligns with package.json extension settings
export const ExtensionSettingsSchema = z.object({
  apiKey: z.optional(z.string()), // Not available client side
  repository: z.string(),
  baseBranch: z.string(),
  customInstructions: z.optional(z.string()),
});

export type ExtensionSettings = z.infer<typeof ExtensionSettingsSchema>;
