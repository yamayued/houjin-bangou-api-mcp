# houjin-bangou-api-mcp

MCP server for the Japan National Tax Agency Corporate Number API.

This project wraps the official Corporate Number Publication Site Web-API and exposes it as MCP
tools for local AI clients.

## Why this exists

The National Tax Agency already provides an official API, but using it from LLM tools still
requires a thin integration layer. This repository aims to be that layer:

- small and auditable
- easy to self-host
- close to the official API
- practical for Japanese business research workflows

## Features

- Get a corporation by 13-digit corporate number
- Search corporations by name
- Fetch updates within a date range
- Return normalized JSON-style output from the official XML API

## Requirements

- Node.js 18 or later
- A National Tax Agency Web-API application ID

Official documentation:

- [Corporate Number API portal](https://www.houjin-bangou.nta.go.jp/webapi/index.html)
- [Corporate Number API specification archive](https://www.houjin-bangou.nta.go.jp/webapi/kyuusiyousyo.html)

## Setup

```bash
npm install
```

Create a local environment file or otherwise export the required variable:

```bash
HOUJIN_BANGOU_API_APPLICATION_ID=YOUR_APPLICATION_ID
```

For local development, copy `.env.example` and load it with your preferred workflow. Do not commit
real credentials.

## Run

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production entrypoint:

```bash
npm start
```

## MCP Tools

### `get_corporation_by_number`

Inputs:

- `corporateNumber`: 13-digit corporate number
- `history`: optional boolean to include historical records

### `search_corporations_by_name`

Inputs:

- `name`: corporation or organization name

### `get_corporation_updates`

Inputs:

- `from`: start date in `YYYY-MM-DD`
- `to`: end date in `YYYY-MM-DD`

## Example MCP configuration

Example command-based configuration for MCP clients that can spawn local servers:

```json
{
  "mcpServers": {
    "houjin-bangou-api": {
      "command": "node",
      "args": [
        "/absolute/path/to/houjin-bangou-api-mcp/dist/server.js"
      ],
      "env": {
        "HOUJIN_BANGOU_API_APPLICATION_ID": "YOUR_APPLICATION_ID"
      }
    }
  }
}
```

If your client supports `npx`, you can also point it at the published package once releases are
available.

## Development

Tests:

```bash
npm test
```

This repository currently focuses on the stdio MCP server. HTTP transport, richer filtering, and
additional Japanese business datasets can be added later without changing the basic API client.

## Security

- Keep your application ID out of Git history, screenshots, and issue reports.
- Use environment variables only.
- Treat all logs as potentially public before sharing them.

## License

MIT
