# Project Guidelines

## Overview

This is an Effect-TS library for interacting with book data APIs (Google Books, Open Library, etc.).

## Tech Stack

- TypeScript with Effect-TS
- NX monorepo
- Vitest for testing
- ESLint for linting
- pnpm for package management

## Commands

- `pnpm typecheck` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests with Vitest
- `pnpm knip` - Check for unused dependencies/exports

## Code Style

- Use Effect-TS patterns (Effect, Layer, Schema, etc.)
- Prefer branded types for domain identifiers
- Use `Schema.TaggedError` for custom errors
- Keep functions pure where possible
- Use dependency injection via Effect services
