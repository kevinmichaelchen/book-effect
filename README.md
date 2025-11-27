# book-effect

[Effect][effect]-based clients for programmatic access to book metadata APIs.

## Packages

| Package                                   | Description                                      |
| ----------------------------------------- | ------------------------------------------------ |
| [@book-effect/core][core]                 | Platform-agnostic types and abstractions         |
| [@book-effect/hardcover][hardcover]       | [Hardcover][hardcover-api] GraphQL API client    |
| [@book-effect/open-library][open-library] | [Open Library][open-library-api] REST API client |
| [@book-effect/google-books][google-books] | [Google Books][google-books-api] REST API client |

## Development

```sh
# Install dependencies
pnpm install

# Build all packages
nx run-many -t build

# Build a specific package
nx build core
```

[effect]: https://effect.website
[core]: ./packages/core
[hardcover]: ./packages/hardcover
[open-library]: ./packages/open-library
[google-books]: ./packages/google-books
[hardcover-api]: https://hardcover.app
[open-library-api]: https://openlibrary.org
[google-books-api]: https://developers.google.com/books
