# Contributing

Thanks for contributing to `houjin-bangou-api-mcp`.

This repository is open to public contributions, but `main` should stay stable. Please use a
fork or a feature branch and open a pull request instead of pushing directly to `main`.

## Good First Contributions

- improve documentation
- add tests for API parsing and error handling
- improve MCP tool descriptions and output formatting
- add small, well-scoped API capabilities backed by official documentation

## Before You Start

- Check existing issues and pull requests to avoid duplicate work.
- If you plan a larger change, open an issue first so we can align on scope.
- Do not commit application IDs, tokens, `.env` files, or private response samples.

## Local Setup

```bash
npm install
npm test
npm run build
```

Set your application ID through an environment variable when you want to test against the live
National Tax Agency API:

```bash
HOUJIN_BANGOU_API_APPLICATION_ID=YOUR_APPLICATION_ID
```

## Pull Request Guidelines

- Keep pull requests focused and reviewable.
- Update documentation when behavior, configuration, or tool outputs change.
- Add or update tests for user-visible behavior.
- Prefer official API terminology unless there is a clear MCP usability reason not to.
- If you introduce a tradeoff, explain it in the pull request description.

## Coding Notes

- TypeScript is the default language for this project.
- Keep dependencies small and justified.
- Favor explicit parsing and simple modules over hidden abstractions.
- Avoid embedding Japanese text directly in shell inline commands. Use UTF-8 `.txt` or `.json`
  files when shell execution needs Japanese input.

## Review Expectations

Pull requests should pass:

- `npm test`
- `npm run build`

Maintainers may ask for changes before merging, especially for API compatibility, output shape, or
public documentation quality.
