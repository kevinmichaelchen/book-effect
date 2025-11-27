# @book-effect/google-books

[Effect][effect]-based client for the [Google Books API][google-books-api].

Google Books provides a stable REST API for searching books and retrieving
metadata including title, authors, publisher, publishedDate, identifiers, and
cover links.

## Installation

```sh
pnpm add @book-effect/google-books
```

## Usage

```typescript
import { GoogleBooksClient } from "@book-effect/google-books";
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const client = yield* GoogleBooksClient;
  const book = yield* client.getByIsbn("9780134757599");
  const results = yield* client.search("Domain Driven Design");
  return { book, results };
});

Effect.runPromise(
  program.pipe(
    Effect.provide(GoogleBooksClient.Live),
    Effect.provide(FetchHttpClient.layer),
  ),
);
```

## Building

```sh
nx build google-books
```

## Resources

- [Google Books API Documentation][google-books-docs]

[effect]: https://effect.website
[google-books-api]: https://books.google.com
[google-books-docs]: https://developers.google.com/books
