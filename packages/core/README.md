# @book-effect/core

Platform-agnostic types and abstractions for book metadata.

This package provides shared types that serve as a common interface across all
book API providers ([Hardcover][hardcover], [Open Library][open-library], and
[Google Books][google-books]).

## Installation

```sh
pnpm add @book-effect/core
```

## Usage

```typescript
import { Book, Author, BookApiClient } from "@book-effect/core";
import type { ISBN10, ISBN13 } from "@book-effect/core";
```

## Exports

### Types

- **Book** - Platform-agnostic book metadata schema
- **Author** - Author schema with name field
- **ISBN10** - Branded type for 10-digit ISBNs
- **ISBN13** - Branded type for 13-digit ISBNs
- **BookId** - Branded type for generic book identifiers
- **Url** - Branded type for URLs

### Errors

- **NetworkError** - Connection/timeout errors
- **NotFoundError** - Book not found
- **ParseError** - Response parsing failures
- **RateLimitError** - API rate limiting
- **BookApiError** - Union of all error types

### Services

- **BookApiClient** - Service interface for book API implementations

## Building

```sh
nx build core
```

[hardcover]: ../hardcover
[open-library]: ../open-library
[google-books]: ../google-books
