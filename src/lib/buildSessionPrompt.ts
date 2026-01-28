import base64 from "base-64";
import { RecordType } from "./records";

export interface CursorImage {
  data: string;
  dimension: {
    width: number;
    height: number;
  };
}

export interface CursorAgentPayload {
  prompt: string;
  branchName: string;
  images?: CursorImage[];
}

export interface BuildSessionOptions {
  customInstructions?: string;
}

interface Attachment {
  id: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  downloadUrl: string;
}

type FetchedFeature = Aha.Feature & {
  referenceNum: string;
  name: string;
  path: string;
  description?: {
    markdownBody?: string;
    attachments?: Attachment[];
  };
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
  description?: {
    markdownBody?: string;
    attachments?: Attachment[];
  };
  feature?: {
    referenceNum: string;
    name?: string;
    description?: {
      markdownBody?: string;
      attachments?: Attachment[];
    };
  };
  tasks?: Array<{
    name: string;
    body?: string;
  }>;
};

async function fetchImageAsBase64(url: string): Promise<CursorImage | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = base64.encode(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    // Create an image to get dimensions
    const blob = new Blob([arrayBuffer]);
    const imageBitmap = await createImageBitmap(blob);
    const dimension = {
      width: imageBitmap.width,
      height: imageBitmap.height,
    };
    imageBitmap.close();

    return { data: data, dimension };
  } catch (error) {
    console.warn(`Error fetching image: ${error}`);
    return null;
  }
}

async function fetchAttachmentImages(
  attachments: Attachment[] | undefined,
): Promise<CursorImage[]> {
  if (!attachments?.length) {
    return [];
  }

  const imageAttachments = attachments.filter((att) =>
    att.contentType.startsWith("image/"),
  );

  const images = await Promise.all(
    imageAttachments.map((att) => fetchImageAsBase64(att.downloadUrl)),
  );

  return images.filter((img): img is CursorImage => img !== null);
}

async function describeFeature(record: RecordType) {
  const feature = (await aha.models.Feature.select(
    "id",
    "name",
    "referenceNum",
    "path",
  )
    .merge({
      description: aha.models.Note.select("markdownBody").merge({
        attachments: aha.models.Attachment.select(
          "fileName",
          "contentType",
          "fileSize",
          "downloadUrl",
        ),
      }),
      tasks: aha.models.Task.select("name", "body"),
      requirements: aha.models.Requirement.select("name", "referenceNum"),
    })
    .find(record.referenceNum)) as FetchedFeature | null;

  if (!feature) {
    throw new Error("Failed to load feature details");
  }

  const images = await fetchAttachmentImages(feature.description?.attachments);

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

  return {
    context,
    title: feature.name,
    referenceNum: feature.referenceNum,
    images,
  };
}

async function describeRequirement(record: RecordType) {
  const requirement = (await aha.models.Requirement.select(
    "id",
    "name",
    "referenceNum",
    "path",
  )
    .merge({
      description: aha.models.Note.select("markdownBody").merge({
        attachments: aha.models.Attachment.select(
          "fileName",
          "contentType",
          "fileSize",
          "downloadUrl",
        ),
      }),
      tasks: aha.models.Task.select("name", "body"),
      feature: aha.models.Feature.select("name", "referenceNum").merge({
        description: aha.models.Note.select("markdownBody").merge({
          attachments: aha.models.Attachment.select(
            "fileName",
            "contentType",
            "fileSize",
            "downloadUrl",
          ),
        }),
      }),
    })
    .find(record.referenceNum)) as FetchedRequirement | null;

  if (!requirement) {
    throw new Error("Failed to load requirement details");
  }

  const allAttachments = [
    ...(requirement.description?.attachments || []),
    ...(requirement.feature?.description?.attachments || []),
  ];
  const images = await fetchAttachmentImages(allAttachments);

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
    images,
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
    branchName: createBranchName({
      title: describe.title,
      referenceNum: describe.referenceNum,
    }),
    images: describe.images.length > 0 ? describe.images : undefined,
  };
}
