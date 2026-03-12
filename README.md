# houjin-bangou-api-mcp

[![CI](https://github.com/yamayued/houjin-bangou-api-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yamayued/houjin-bangou-api-mcp/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

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
- Get up to 10 corporations in one request
- Include historical records for corporation number lookups
- Search corporations by name
- Filter name searches by mode, target, address, kind, change status, close status, assignment date, and page
- Fetch updates within a date range
- Filter update searches by address, kind, and page
- Support the official response formats: CSV (Shift-JIS), CSV (Unicode), and XML
- Return normalized JSON-style output from the official XML API

## Coverage

This MCP server targets the latest supported `Ver.4.0` Corporate Number API and exposes the
documented request conditions for its three core endpoints:

- `/num`
- `/name`
- `/diff`

## Requirements

- Node.js 18 or later
- A National Tax Agency Web-API application ID

Official documentation:

- [Corporate Number API portal](https://www.houjin-bangou.nta.go.jp/webapi/index.html)
- [Corporate Number API specification archive](https://www.houjin-bangou.nta.go.jp/webapi/kyuusiyousyo.html)
- [Web-API Ver.4.0 request and response details](https://www.houjin-bangou.nta.go.jp/pc/webapi/images/k-web-api-kinou-ver4.pdf)

## Quick Start

This is the shortest path from clone to a successful MCP call.

### 1. Install dependencies

```bash
npm install
```

### 2. Set your application ID

Use an environment variable and never commit the real value.

macOS or Linux:

```bash
export HOUJIN_BANGOU_API_APPLICATION_ID=YOUR_APPLICATION_ID
```

Windows PowerShell:

```powershell
$env:HOUJIN_BANGOU_API_APPLICATION_ID = "YOUR_APPLICATION_ID"
```

For local development, copy `.env.example` and load it with your preferred workflow.

### 3. Build the server

```bash
npm run build
```

### 4. Point your MCP host at the built server

#### Claude Desktop

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

#### Codex

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

#### Generic MCP host

Use the same command-based configuration if your host accepts an `mcpServers` object.

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

#### Windows path example

```json
{
  "mcpServers": {
    "houjin-bangou-api": {
      "command": "node",
      "args": [
        "C:\\Users\\owner\\OneDrive\\Desktop\\my_project\\houjin-bangou-api-mcp\\dist\\server.js"
      ],
      "env": {
        "HOUJIN_BANGOU_API_APPLICATION_ID": "YOUR_APPLICATION_ID"
      }
    }
  }
}
```

### 5. Make the first successful call

Start with the smallest happy path:

Tool:

```text
get_corporation_by_number
```

Arguments:

```json
{
  "corporateNumber": "7000012050002"
}
```

Illustrative result shape when `responseType` is omitted:

```json
{
  "metadata": {
    "lastUpdateDate": "YYYY-MM-DD",
    "count": 1,
    "divideNumber": 1,
    "divideSize": 1
  },
  "corporations": [
    {
      "corporateNumber": "7000012050002",
      "name": "国税庁",
      "latest": true
    }
  ]
}
```

Once that works, try:

- `search_corporations_by_name` with `{ "name": "任天堂株式会社" }`
- `get_corporation_updates` with a recent date window such as `{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }`
- `get_corporation_by_number` with `responseType: "02"` or `responseType: "01"`

### 6. Run the recommended end-to-end live check

After the first call works, use one command for the full live verification path:

```bash
npm run verify:live
```

Expected result:

- the server builds once
- MCP tool registration succeeds
- the real-company checks pass
- advanced filters pass
- all response types pass

If `HOUJIN_BANGOU_API_APPLICATION_ID` is missing, this command fails immediately with a clear
message instead of running partial checks.

## Getting an Application ID

You need a National Tax Agency Web-API application ID before the MCP server can call the live API.

As of March 12, 2026, the official flow is:

1. Open the official application ID registration page on the invoice site.
2. Submit the registration form and receive an application ID.
3. If you will use that ID with the Corporate Number API, follow the current instructions on the
   Corporate Number API portal, which point to the invoice site flow and email confirmation.

Official pages:

- [Corporate Number API portal](https://www.houjin-bangou.nta.go.jp/webapi/index.html)
- [Invoice site Web-API page](https://www.invoice-kohyo.nta.go.jp/web-api/index.html)
- [Application ID registration page](https://www.invoice-kohyo.nta.go.jp/app/id_todokede)

At the time of writing, the Corporate Number API portal instructs users who obtained an ID from the
invoice site to email `invoice-webapi@nta.go.jp` with their name, email address, and a note that
they want to use the Corporate Number API. Always check the official pages above for the latest
procedure before sharing credentials or support instructions.

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

`npm start` launches a stdio MCP server and waits for a client connection. Seeing no prompt after
startup is normal.

## MCP Tools

### `get_corporation_by_number`

Inputs:

- `corporateNumber`: 13-digit corporate number
- `corporateNumbers`: optional array of up to 10 corporate numbers
- `history`: optional boolean to include historical records
- `responseType`: optional response type, `12` XML, `02` Unicode CSV, `01` Shift-JIS CSV

### `search_corporations_by_name`

Inputs:

- `name`: corporation or organization name
- `responseType`: optional response type, `12` XML, `02` Unicode CSV, `01` Shift-JIS CSV
- `mode`: optional search mode, `1` prefix or `2` partial match
- `target`: optional target, `1` name, `2` furigana, `3` both
- `address`: optional 2-digit prefecture code or 5-digit city code
- `kinds`: optional array of corporation kind filters: `01`, `02`, `03`, `04`
- `change`: optional boolean to include changed records
- `close`: optional boolean to include closed corporations
- `assignmentFrom`: optional assignment date lower bound in `YYYY-MM-DD`
- `assignmentTo`: optional assignment date upper bound in `YYYY-MM-DD`
- `divide`: optional page number for paginated API results

### `get_corporation_updates`

Inputs:

- `from`: start date in `YYYY-MM-DD`
- `to`: end date in `YYYY-MM-DD`
- `responseType`: optional response type, `12` XML, `02` Unicode CSV, `01` Shift-JIS CSV
- `address`: optional 2-digit prefecture code or 5-digit city code
- `kinds`: optional array of corporation kind filters: `01`, `02`, `03`, `04`
- `divide`: optional page number for paginated API results

## Input Rules and API Limits

These rules are enforced by the MCP server before the request reaches the official API.

- `corporateNumber` must be a 13-digit string
- `corporateNumbers` can contain 1 to 10 values
- `corporateNumber` and `corporateNumbers` are mutually exclusive
- `address` must be either a 2-digit prefecture code or a 5-digit city code
- `assignmentFrom` and `assignmentTo` must be real dates on or after `2015-10-05`
- `assignmentFrom` must be on or before `assignmentTo`
- `from` and `to` for `get_corporation_updates` must be real dates on or after `2015-12-01`
- `from` and `to` for `get_corporation_updates` must stay within 50 days inclusive
- `divide` must be a positive integer

## Response Types

The official API `type` switch is exposed through `responseType`.

- `12`: XML from the source API, returned by this MCP as structured JSON-style data
- `02`: Unicode CSV from the source API, returned by this MCP as raw text
- `01`: Shift-JIS CSV from the source API, returned by this MCP as raw text

### Structured example: `responseType: "12"`

This example shows the shape of a successful response, not a fixed live snapshot.

```json
{
  "metadata": {
    "lastUpdateDate": "YYYY-MM-DD",
    "count": 1,
    "divideNumber": 1,
    "divideSize": 1
  },
  "corporations": [
    {
      "corporateNumber": "7000012050002",
      "name": "国税庁",
      "prefectureName": "東京都",
      "cityName": "千代田区",
      "latest": true
    }
  ]
}
```

### Raw CSV example: `responseType: "02"` or `responseType: "01"`

```json
{
  "responseType": "02",
  "contentType": "text/csv;charset=UTF-8",
  "raw": "YYYY-MM-DD,1,1,1\n1,7000012050002,01,1,2018-04-02,2015-10-05,\"国税庁\",..."
}
```

Use `12` when you want fields you can safely consume in tools or downstream code. Use `01` or `02`
when you need the source CSV payload.

## Structured Response Fields

When `responseType` is omitted or set to `12`, the MCP server returns:

- `metadata`: source pagination and result metadata from the official API
- `corporations`: normalized corporation records from the XML payload

Common `metadata` fields:

- `lastUpdateDate`: source update date reported by the API
- `count`: total record count for the request
- `divideNumber`: current page number reported by the source API
- `divideSize`: total number of pages reported by the source API

Common `corporations[]` fields:

- `corporateNumber`: 13-digit corporate number
- `name`: Japanese corporation name
- `furigana`: furigana when the API provides it
- `prefectureName`, `cityName`, `streetNumber`: Japanese address fragments
- `enName`, `enPrefectureName`, `enCityName`, `enAddressOutside`: English fields when present
- `kind`: official corporation kind code
- `process`: official source process code
- `correct`: normalized boolean flag from the source `0` or `1`
- `latest`: normalized boolean flag from the source `0` or `1`
- `hidden`: normalized boolean flag from the source hidden marker
- `closeDate`, `closeCause`: closure metadata for dissolved or closed corporations
- `successorCorporateNumber`: successor corporation number when present
- `changeCause`: official reason code for a change
- `assignmentDate`, `updateDate`, `changeDate`: important source dates

The MCP server keeps official field names close to the source API so users can map the values back
to the National Tax Agency documentation. For the normative meaning of codes such as `kind`,
`process`, `closeCause`, and `changeCause`, use the official Ver.4.0 specification:

- [Web-API Ver.4.0 request and response details](https://www.houjin-bangou.nta.go.jp/pc/webapi/images/k-web-api-kinou-ver4.pdf)

## Pagination

The official API paginates some responses. This MCP server exposes the same page metadata through
`metadata.count`, `metadata.divideNumber`, and `metadata.divideSize`.

Typical workflow:

1. Call `search_corporations_by_name` or `get_corporation_updates` without `divide` first.
2. Read `metadata.divideSize`.
3. If `divideSize` is greater than `1`, call the same tool again with `divide: 2`, `divide: 3`,
   and so on until you reach the last page.

Illustrative example:

```json
{
  "name": "株式会社",
  "divide": 2
}
```

The MCP server does not auto-follow all pages yet. That is intentional so callers can control API
usage and stop early when they already have enough records.

## Verification Checklist

Use these checks in order when setting up or debugging.

### Basic test suite

```bash
npm test
```

Expected result:

- all tests pass

### Build

```bash
npm run build
```

Expected result:

- `dist/server.js` is generated without TypeScript errors

### MCP connection check

```bash
npm run smoke:mcp
```

Expected result:

- the three tools are listed
- if `HOUJIN_BANGOU_API_APPLICATION_ID` is set, live API calls also succeed

### One-command live verification

```bash
npm run verify:live
```

Expected result:

- build runs once at the start
- the script stops on the first failing live check
- successful output ends with `verify:live completed successfully`

### Real-company check

```bash
npm run check:companies
```

Expected result:

- National Tax Agency, Nintendo, Toyota Motor, and Sony Group are all found as expected

### Advanced filter check

```bash
npm run check:advanced-filters
```

Expected result:

- multiple corporate numbers resolve in one request
- filtered name search returns the expected narrow result set
- filtered diff search returns live update records

### Response type check

```bash
npm run check:response-types
```

Expected result:

- `12` returns structured data
- `02` returns Unicode CSV text
- `01` returns Shift-JIS CSV text decoded into readable output

### Packaged install check

```bash
npm run smoke:package
```

Expected result:

- installed package entrypoints expose the three tools
- missing application ID fails clearly
- Windows installs work even when the repository path contains non-ASCII characters

### Package dry-run

```bash
npm run check:pack
```

Expected result:

- `npm pack --dry-run` succeeds and includes the intended files

## Installation Paths

### Use from this repository today

Clone the repository, run `npm install`, build it, and point your MCP host at
`/absolute/path/to/houjin-bangou-api-mcp/dist/server.js`.

### Use from npm later

This repository is ready for package-oriented verification, but npm publishing is still a future
distribution path. Once published, the README can add an `npx`-based install path alongside the
repository-based setup above.

## Common Issues

### Missing application ID

Symptom:

- the server exits immediately with `Missing HOUJIN_BANGOU_API_APPLICATION_ID`

Fix:

- set `HOUJIN_BANGOU_API_APPLICATION_ID` in the environment passed to the MCP host

### Diff range is rejected

Symptom:

- `from must be on or before to`
- `from and to must be within 50 days`
- `from must be on or after 2015-12-01`

Fix:

- keep the date window within 50 days inclusive
- use dates on or after `2015-12-01`

### Name assignment dates are rejected

Symptom:

- `assignmentFrom must be on or after 2015-10-05`
- `assignmentTo must be on or after 2015-10-05`

Fix:

- use assignment date filters on or after `2015-10-05`

### Address code is rejected

Symptom:

- `address must be a 2-digit prefecture code or 5-digit city code`

Fix:

- pass values such as `13` for Tokyo prefecture or `13101` for Chiyoda City

### CSV was expected but structured data came back

Symptom:

- the result contains `metadata` and `corporations`

Fix:

- set `responseType` to `02` or `01`
- leave `responseType` unset or use `12` when you want structured output

### Upstream request timed out

Symptom:

- `Corporate Number API request timed out after 15000 ms`

Fix:

- retry the request after confirming network connectivity
- reduce the request scope when possible, for example by narrowing date ranges or filters

## Contributing

Public contributions are welcome. Please open a pull request instead of pushing directly to
`main`.

- Contribution guide: [CONTRIBUTING.md](./CONTRIBUTING.md)
- Code of conduct: [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- Roadmap: [ROADMAP.md](./ROADMAP.md)

Pull requests are expected to pass CI:

- `npm test`
- `npm run build`

## Security

- Keep your application ID out of Git history, screenshots, and issue reports.
- Use environment variables only.
- Treat all logs as potentially public before sharing them.

## License

MIT
