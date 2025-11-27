# @book-effect/hardcover

[Effect][effect]-based client for the [Hardcover API][hardcover-api].

Hardcover provides a documented, key-based GraphQL API that exposes rich book
metadata including title, authors, published year, tags, and ratings.

## Installation

```sh
pnpm add @book-effect/hardcover
```

## Usage

```typescript
import { HardcoverClient, HardcoverConfig } from "@book-effect/hardcover";
import { FetchHttpClient } from "@effect/platform";
import { Effect } from "effect";

const program = Effect.gen(function* () {
  const client = yield* HardcoverClient;
  const book = yield* client.getByIsbn("9780134757599");
  const results = yield* client.search("Domain Driven Design");
  return { book, results };
});

Effect.runPromise(
  program.pipe(
    Effect.provide(HardcoverClient.Live),
    Effect.provide(HardcoverConfig.FromEnv), // reads HARDCOVER_API_KEY
    Effect.provide(FetchHttpClient.layer),
  ),
);
```

## Building

```sh
nx build hardcover
```

## Resources

- [Hardcover API Documentation][hardcover-docs]
- [Leveraging Hardcover API][hardcover-blog]
- [Hardcover Book API Guide][hardcover-guide]

[effect]: https://effect.website
[hardcover-api]: https://hardcover.app
[hardcover-docs]: https://github.com/hardcoverapp/hardcover-docs
[hardcover-blog]:
  http://bookclub.wiselapwing.co.uk/blog/leveraging-hardcover-api
[hardcover-guide]: https://www.emgoto.com/hardcover-book-api/
