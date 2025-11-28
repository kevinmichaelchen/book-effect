# book-effect

[Effect][effect]-based clients for programmatic access to book metadata APIs.

## Packages

| Package                                   | Version                        | Description                                      |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------ |
| [@book-effect/core][core]                 | [![npm][core-badge]][core-npm] | Platform-agnostic types and abstractions         |
| [@book-effect/hardcover][hardcover]       | [![npm][hc-badge]][hc-npm]     | [Hardcover][hardcover-api] GraphQL API client    |
| [@book-effect/open-library][open-library] | [![npm][ol-badge]][ol-npm]     | [Open Library][open-library-api] REST API client |
| [@book-effect/google-books][google-books] | [![npm][gb-badge]][gb-npm]     | [Google Books][google-books-api] REST API client |

## Development

```sh
# Install dependencies
pnpm install

# Build all packages
nx run-many -t build

# Build a specific package
nx build core
```

## Releasing

Releases are fully automated via GitHub Actions when commits are pushed to
`main`. The workflow uses [NX Release][nx-release] with [conventional
commits][conventional-commits] to determine version bumps:

| Commit prefix     | Version bump |
| ----------------- | ------------ |
| `feat:`           | Minor        |
| `fix:`            | Patch        |
| `BREAKING CHANGE` | Major        |

On each push to `main`, the release workflow will:

1. Analyze commits since the last release
2. Bump package versions accordingly
3. Update `CHANGELOG.md`
4. Create a git tag and GitHub Release
5. Publish packages to npm

[effect]: https://effect.website
[core]: ./packages/core
[hardcover]: ./packages/hardcover
[open-library]: ./packages/open-library
[google-books]: ./packages/google-books
[hardcover-api]: https://hardcover.app
[open-library-api]: https://openlibrary.org
[google-books-api]: https://developers.google.com/books
[nx-release]: https://nx.dev/features/release
[conventional-commits]: https://www.conventionalcommits.org
[core-badge]: https://img.shields.io/npm/v/@book-effect/core
[core-npm]: https://www.npmjs.com/package/@book-effect/core
[hc-badge]: https://img.shields.io/npm/v/@book-effect/hardcover
[hc-npm]: https://www.npmjs.com/package/@book-effect/hardcover
[ol-badge]: https://img.shields.io/npm/v/@book-effect/open-library
[ol-npm]: https://www.npmjs.com/package/@book-effect/open-library
[gb-badge]: https://img.shields.io/npm/v/@book-effect/google-books
[gb-npm]: https://www.npmjs.com/package/@book-effect/google-books
