# @book-effect/open-library

[Effect][effect]-based client for the [Open Library API][open-library-api].

Open Library provides a free, open, well-documented REST API for books, authors,
subjects, covers, and more. It supports lookup by ISBN, OLID, and search
queries.

## Installation

```sh
pnpm add @book-effect/open-library
```

## Usage

```typescript
import { OpenLibraryClient } from "@book-effect/open-library";
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const client = yield* OpenLibraryClient;
  const book = yield* client.getByIsbn("9780134757599");
  const results = yield* client.search("Domain Driven Design");
  return { book, results };
});

Effect.runPromise(
  program.pipe(
    Effect.provide(OpenLibraryClient.Live),
    Effect.provide(FetchHttpClient.layer),
  ),
);
```

## Building

```sh
nx build open-library
```

## Resources

- [Open Library API Documentation][open-library-docs]
- [Open Library API (publicapis.io)][open-library-publicapis]
- [Open Library API (publicapi.dev)][open-library-publicapi]

[effect]: https://effect.website
[open-library-api]: https://openlibrary.org
[open-library-docs]: https://openlibrary.org/dev/docs/api/read
[open-library-publicapis]: https://publicapis.io/open-library-api-api
[open-library-publicapi]: https://publicapi.dev/open-library-api
