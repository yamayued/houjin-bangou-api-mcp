# Roadmap

This repository is intentionally small today. The best next steps are the ones that make the MCP
server more useful without making it opaque.

## Near Term

- add pagination-friendly outputs for large name search results
- improve API error mapping so MCP clients get clearer messages
- add fixtures covering more corporation states such as closures and successors
- publish to npm for easier client setup

## Good First Issues

- improve tool descriptions and examples in the README
- add more real-world fixture coverage to parsing tests
- document client configuration examples for Claude Desktop and other MCP hosts
- add lightweight response shaping for common user tasks

## Longer Term

- optional HTTP transport
- additional search filters when supported cleanly by the official API
- interoperability with adjacent Japanese public-business datasets

## Contribution Direction

If you want to help, prioritize:

1. correctness against the official National Tax Agency API
2. good MCP ergonomics for AI clients
3. simple implementation over clever abstraction
