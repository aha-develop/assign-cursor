import { RecordType } from "./records";

export interface CursorAgentPayload {
  prompt: string;
  branchName: string;
}

export interface BuildSessionOptions {
  customInstructions?: string;
}

type FetchedFeature = Aha.Feature & {
  referenceNum: string;
  name: string;
  path: string;
  description?: { markdownBody?: string };
  requirements?: Array<{
    referenceNum: string;
    name?: string;
    description?: { markdownBody?: string };
  }>;
  tasks?: Array<{
    name: string;
    body?: string;
  }>;
};

type FetchedRequirement = Aha.Requirement & {
  referenceNum: string;
  name: string;
  path: string;
  description?: { markdownBody?: string };
  feature?: {
    referenceNum: string;
    name?: string;
    description?: { markdownBody?: string };
  };
  tasks?: Array<{
    name: string;
    body?: string;
  }>;
};

async function describeFeature(record: RecordType) {
  const feature = (await aha.models.Feature.select(
    "id",
    "name",
    "referenceNum",
    "path",
  )
    .merge({
      description: ["markdownBody"],
      tasks: aha.models.Task.select("name", "body"),
      requirements: aha.models.Requirement.select("name", "referenceNum"),
    })
    .find(record.referenceNum)) as FetchedFeature | null;

  if (!feature) {
    throw new Error("Failed to load feature details");
  }

  const requirementsBlock = feature.requirements?.length
    ? `### Requirements\n${feature.requirements
        .map(
          (req) =>
            `- **${req.referenceNum}**: ${req.name || "No name provided"}`,
        )
        .join("\n")}`
    : "";

  const todosBlock = feature.tasks?.length
    ? `### Todos\n${feature.tasks
        .map((task) => `- **${task.name}**\n\n${task.body || ""}`)
        .join("\n\n")}`
    : "";

  const context = `### Description\n\n${
    feature.description?.markdownBody || "No description provided."
  }\n\n${requirementsBlock}\n\n${todosBlock}\n\n**Aha! Reference:** [${
    record.referenceNum
  }](${feature.path})\n`;

  return { context, title: feature.name, referenceNum: feature.referenceNum };
}

async function describeRequirement(record: RecordType) {
  const requirement = (await aha.models.Requirement.select(
    "id",
    "name",
    "referenceNum",
    "path",
  )
    .merge({
      description: ["markdownBody"],
      tasks: aha.models.Task.select("name", "body"),
      feature: aha.models.Feature.select("name", "referenceNum").merge({
        description: ["markdownBody"],
      }),
    })
    .find(record.referenceNum)) as FetchedRequirement | null;

  if (!requirement) {
    throw new Error("Failed to load requirement details");
  }

  const todosBlock = requirement.tasks?.length
    ? `### Todos\n${requirement.tasks
        .map((task) => `- **${task.name}**\n\n${task.body || ""}`)
        .join("\n\n")}`
    : "";

  const context = `### Description\n\n${
    requirement.description?.markdownBody || "No description provided."
  }\n\n## Feature ${requirement.feature?.referenceNum}\n\n${
    requirement.feature?.description?.markdownBody ||
    "No feature description provided."
  }\n\n${todosBlock}\n\n**Aha! Reference:** [${record.referenceNum}](${
    requirement.path
  })\n`;

  return {
    context,
    title: requirement.name,
    referenceNum: requirement.referenceNum,
  };
}

function createBranchName({
  title,
  referenceNum,
}: {
  title: string;
  referenceNum: string;
}): string {
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);

  return `${referenceNum.toLowerCase()}-${sanitizedTitle}`;
}

export async function buildSessionPrompt(
  record: RecordType,
  options: BuildSessionOptions,
): Promise<CursorAgentPayload> {
  const { customInstructions } = options;

  const describe =
    record.typename === "Feature"
      ? await describeFeature(record)
      : await describeRequirement(record);

  const header = `You are being assigned the Aha! ${record.typename.toLowerCase()} ${
    describe.referenceNum
  }: ${describe.title}.`;
  const goal =
    "Review the context and begin executing the work. Create a new branch in the repository ";

  let prompt = `${header}\n\n${goal}\n\n${describe.context}`;

  if (customInstructions) {
    prompt += `\n### Additional Instructions\n\n${customInstructions}\n`;
  }

  return {
    prompt,
    // todo return images
    branchName: createBranchName({
      title: describe.title,
      referenceNum: describe.referenceNum,
    }),
  };
}
