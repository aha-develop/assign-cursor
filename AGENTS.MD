# Assign Cursor Extension

Aha! extension that integrates with Cursor Cloud Agent API to assign Features and Requirements to Cursor for implementation.

## Structure

```
assign-cursor/
  src/
    lib/
      constants.ts       - Extension ID, API URL, field names
      events.ts          - callEventHandler/registerEventHandler utilities
      settings.ts        - Zod schema for extension settings
      records.ts         - Record type definitions and helpers
      buildSessionPrompt.ts - Builds prompt from Aha! record context
    events/
      createCursorAgent.ts - Cursor API integration (POST /v0/agents)
    views/
      Icon.tsx            - Cursor arrow/pointer SVG icon
      SendToAI.tsx        - Generic card layout component
      SendToCursorButton.tsx - Main UI component, handles button states
  package.json           - Extension config, settings definitions
```

## Key Files

- **package.json** - Defines extension settings (repository, baseBranch, apiKey, customInstructions) and view/event entry points
- **createCursorAgent.ts** - Makes API call to Cursor using Basic Auth (`apiKey:` encoded as base64)
- **SendToCursorButton.tsx** - React component with idle/loading/success/error/existing states

## Cursor API

- Documentation https://cursor.com/docs/cloud-agent/api/endpoints
- **Endpoint**: `https://api.cursor.com/v0/agents` (POST)
- **Auth**: Basic Auth with API key (format: `apiKey:` base64 encoded)
- **Request Body**:
  ```json
  {
    "prompt": { "text": "..." },
    "source": { "repository": "owner/repo", "ref": "main" },
    "target": { "autoCreatePr": true }
  }
  ```
- **Response**: `{ id, status, createdAt, target: { url } }`

## Extension Settings

| Setting            | Type   | Description                         |
| ------------------ | ------ | ----------------------------------- |
| repository         | string | GitHub repo in `owner/repo` format  |
| baseBranch         | string | Default branch (defaults to "main") |
| apiKey             | secret | Cursor API key                      |
| customInstructions | string | Optional extra prompt guidance      |

## Development

```bash
cd assign-cursor
npm install
```

## TypeScript Notes

The .aha-cache types may show many errors - these are from the Aha SDK type definitions and can be ignored. Focus on errors in the `src/` directory only.
