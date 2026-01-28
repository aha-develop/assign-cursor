import * as z from "zod/mini";
import base64 from "base-64";
import { CURSOR_API_URL, EXTENSION_ID, EXTENSION_NAME } from "../lib/constants";
import { callEventHandler, registerEventHandler } from "../lib/events";
import { ExtensionSettingsSchema } from "../lib/settings";

const CreateAgentSchema = z.object({
  prompt: z.string(),
  branchName: z.string(),
  images: z.optional(
    z.array(
      z.object({
        data: z.string(),
        dimension: z.object({
          width: z.number(),
          height: z.number(),
        }),
      }),
    ),
  ),
});

const CursorResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
  createdAt: z.string(),
  target: z.object({
    url: z.string(),
  }),
});

export const CursorAgentDataSchema = z.object({
  sessionId: z.string(),
  sessionUrl: z.string(),
  assignedAt: z.string(),
});

export type CursorAgentData = z.infer<typeof CursorAgentDataSchema>;

export type CreateAgent = z.infer<typeof CreateAgentSchema>;

async function createAgent({
  prompt,
  repository,
  baseBranch,
  branchName,
  apiKey,
}: {
  prompt: string;
  repository: string;
  baseBranch: string;
  branchName: string;
  apiKey: string;
}): Promise<CursorAgentData> {
  const agentPayload: Record<string, unknown> = {
    prompt: { text: prompt }, // Todo images
    source: {
      repository,
      ref: baseBranch,
    },
    target: {
      autoCreatePr: true,
      branchName,
    },
  };

  const response = await fetch(`${CURSOR_API_URL}/agents`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${base64.encode(`${apiKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(agentPayload),
  });

  console.log(`DEBUG API Key ${apiKey.substring(0, 4)}...`);
  console.log(`DEBUG payload ${JSON.stringify(agentPayload)}`);
  console.log(`DEBUG response ${JSON.stringify(response)}`);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" && data && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : typeof data === "object" && data && "message" in data
          ? String((data as { message: unknown }).message)
          : `${EXTENSION_NAME} API error (${response.status})`;
    throw new Error(message);
  }

  const result = CursorResponseSchema.safeParse(data);
  if (!result.success) {
    console.error(
      `Invalid Cursor API response ${JSON.stringify(data)} ${result.error}`,
    );
    throw new Error(`Invalid response from ${EXTENSION_NAME} API`);
  }

  const sessionUrl = result.data.target?.url;

  return {
    sessionId: result.data.id,
    sessionUrl,
    assignedAt: new Date().toISOString(),
  };
}

export async function createCursorAgent(
  args: CreateAgent,
): Promise<CursorAgentData> {
  return callEventHandler<CursorAgentData>({
    extensionId: EXTENSION_ID,
    eventName: "createCursorAgent",
    args,
  });
}

registerEventHandler({
  extensionId: EXTENSION_ID,
  eventName: "createCursorAgent",
  schema: CreateAgentSchema,
  resultSchema: CursorAgentDataSchema,
  handler: async (args, { settings: rawSettings }) => {
    const { prompt, branchName } = args;

    const parsedSettings = ExtensionSettingsSchema.safeParse(rawSettings);
    if (!parsedSettings.success) {
      console.error(
        `Invalid extension settings: ${parsedSettings.error.message}`,
      );
      throw new Error(
        `${EXTENSION_NAME} extension settings are not properly configured`,
      );
    }
    const { apiKey, repository, baseBranch } = parsedSettings.data;

    if (!apiKey) {
      throw new Error(`${EXTENSION_NAME} API key is not configured`);
    }

    const result = await createAgent({
      prompt,
      repository,
      baseBranch: baseBranch || "main",
      branchName,
      apiKey,
    });

    return result;
  },
});
