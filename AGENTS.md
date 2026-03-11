# AGENTS.md

This repository is public. Treat every file, commit, issue, pull request, log snippet, and
example value as if it may be read by anyone.

## Purpose

This project provides a Model Context Protocol (MCP) server for the Japan National Tax Agency
Corporate Number Publication Site Web-API.

Primary goals:

- expose the official API through clear MCP tools
- keep the server small, auditable, and easy to self-host
- avoid bundling any private or organization-specific configuration

## Public Repository Rules

- Never commit API keys, application IDs, tokens, cookies, `.env` files, or captured responses
  that contain sensitive data.
- Do not include real credentials in examples, tests, screenshots, logs, or documentation.
- Use placeholders such as `YOUR_APPLICATION_ID` in docs and sample configs.
- Keep all defaults safe for public open source use.
- Do not assume access to private infrastructure, internal URLs, or paid services.

## Configuration

- Read secrets from environment variables only.
- Document every required environment variable in `README.md`.
- Provide a checked-in example file such as `.env.example` when configuration is added.
- Fail with a clear error message when required configuration is missing.

## API Implementation Expectations

- Follow the official National Tax Agency Web-API documentation and prefer the latest supported
  version.
- Keep request/response handling close to the official field names unless there is a strong MCP
  usability reason to normalize them.
- Preserve important source metadata so users can trace MCP output back to the official API.
- Be explicit about rate limits, pagination, and error handling in code and docs.
- If the official API behavior is unclear, add a note to the docs instead of guessing silently.

## Coding Standards

- Prefer TypeScript for the MCP server unless the repository already adopts another stack.
- Keep dependencies minimal and choose well-maintained packages.
- Favor simple modules over framework-heavy abstractions.
- Add comments only when they help explain non-obvious behavior.
- Avoid hard-coding Japanese text directly in shell inline commands. If shell execution needs
  Japanese text, read it from a UTF-8 `.txt` or `.json` file.

## Testing And Verification

- Add or update tests for behavior that can regress.
- Cover request building, response parsing, and error handling before adding convenience features.
- Prefer deterministic fixtures with redacted sample data.
- Include a basic local verification flow in `README.md` once runnable code exists.

## Documentation

- Keep setup steps short and reproducible on a clean machine.
- Document required API registration steps without copying large sections of official content.
- Link to the official API documentation for normative details.
- When adding MCP tools, describe each tool's purpose, inputs, and outputs in the README.

## Non-Goals

- Storing user data
- Bundling private datasets
- Shipping organization-specific prompts or hidden operational knowledge

## When Making Changes

- Update docs when behavior or configuration changes.
- Prefer small, reviewable commits.
- If a tradeoff affects public users, record the reason in code comments, docs, or the pull
  request description.
