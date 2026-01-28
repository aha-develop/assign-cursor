import React, { useState } from "react";
import {
  createCursorAgent,
  CursorAgentData,
  CursorAgentDataSchema,
} from "../events/createCursorAgent";
import { buildSessionPrompt } from "../lib/buildSessionPrompt";
import { EXTENSION_ID, SESSION_FIELD } from "../lib/constants";
import { isAssignableRecord, RecordType } from "../lib/records";
import { ExtensionSettings, ExtensionSettingsSchema } from "../lib/settings";
import { Icon } from "./Icon";
import { SendToAI } from "./SendToAI";

type Status =
  | "not-configured"
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "existing";

interface SendToCursorButtonProps {
  record: RecordType;
  settings?: ExtensionSettings;
  existingSession?: CursorAgentData;
}

const SendToCursorButton: React.FC<SendToCursorButtonProps> = ({
  record,
  settings,
  existingSession,
}) => {
  const [status, setStatus] = useState<Status>(
    !settings?.repository
      ? "not-configured"
      : existingSession
        ? "existing"
        : "idle",
  );
  const [message, setMessage] = useState<string>(
    existingSession ? "Sent to Cursor." : "",
  );
  const [sessionUrl, setSessionUrl] = useState<string>(
    existingSession?.sessionUrl || "",
  );

  const handleClick = async () => {
    setStatus("loading");
    setMessage("Gathering context...");

    try {
      const { branchName, prompt, images } = await buildSessionPrompt(record, {
        customInstructions: settings.customInstructions,
      });

      setMessage(`Creating Cursor agent...`);

      const session = await createCursorAgent({
        branchName,
        prompt,
        images,
      });

      await record.setExtensionField(EXTENSION_ID, SESSION_FIELD, session);

      setStatus("success");
      setMessage(
        `Success. Cursor has started work on this ${record.typename.toLowerCase()}.`,
      );
      setSessionUrl(session.sessionUrl || "");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setStatus("error");
      setMessage(errorMessage);
    }
  };

  return (
    <>
      {(status === "idle" ||
        status === "error" ||
        status === "not-configured") && (
        <SendToAI
          label="Build with Cursor"
          icon={<Icon />}
          button={
            status === "not-configured" ? (
              <aha-button
                kind="secondary"
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  window.open("/develop/settings/account/extensions");
                }}
              >
                Configure Cursor <i className="fa-regular fa-gear"></i>
              </aha-button>
            ) : (
              <aha-button kind="secondary" size="small" onClick={handleClick}>
                Send to Cursor <i className="fa-regular fa-arrow-right"></i>
              </aha-button>
            )
          }
          footer={`Share this ${record.typename.toLowerCase()} with Cursor to begin implementation.`}
          alert={
            status === "error" ? (
              <aha-alert type="danger" size="mini">
                {message || "An unexpected error occurred."}
              </aha-alert>
            ) : null
          }
        />
      )}

      {status === "loading" && (
        <SendToAI
          label="Sending to Cursor..."
          icon={<Icon />}
          button={
            <aha-button
              kind="secondary"
              size="small"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              <span>
                Creating agent
                <aha-spinner style={{ marginLeft: "6px" }} size="10px" />
              </span>
            </aha-button>
          }
          footer={message}
        />
      )}

      {(status === "success" || status === "existing") && (
        <>
          <SendToAI
            label="Assigned to Cursor"
            icon={<Icon />}
            button={
              <aha-button
                kind="secondary"
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  window.open(sessionUrl, "_blank", "noopener noreferrer");
                }}
              >
                View Agent
                <i className="fa-regular fa-arrow-up-right" />
              </aha-button>
            }
            alert={
              status === "success" ? (
                <aha-alert type="success" size="mini">
                  {message}
                </aha-alert>
              ) : null
            }
          />
        </>
      )}
    </>
  );
};

aha.on(
  "sendToCursorButton",
  ({ record, fields }, { settings: rawSettings }) => {
    if (!isAssignableRecord(record)) {
      return (
        <aha-alert type="danger">
          Send to Cursor is only available on Features and Requirements.
        </aha-alert>
      );
    }

    const rawField = fields?.[SESSION_FIELD];
    const recordSession = CursorAgentDataSchema.safeParse(rawField);
    const existingSession = recordSession.success
      ? recordSession.data
      : undefined;

    const parsedSettings = ExtensionSettingsSchema.safeParse(rawSettings);
    const settings = parsedSettings.success ? parsedSettings.data : undefined;

    const typedRecord = record as RecordType;

    return (
      <SendToCursorButton
        record={typedRecord}
        settings={settings}
        existingSession={existingSession}
      />
    );
  },
);
