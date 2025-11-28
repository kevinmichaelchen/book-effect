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

This project uses [NX Release][nx-release] with [conventional
commits][conventional-commits] for automated versioning.

### Create a release

```sh
# Preview what will happen (dry run)
nx release --skip-publish --dry-run

# Create the release (bumps versions, generates changelog, creates git tag)
nx release --skip-publish

# Push the tag to trigger the release workflow
git push --follow-tags
```

The `--skip-publish` flag is used because publishing to npm is handled by GitHub
Actions when the tag is pushed.

### How versioning works

Version bumps are determined automatically from commit messages:

| Commit prefix     | Version bump |
| ----------------- | ------------ |
| `feat:`           | Minor        |
| `fix:`            | Patch        |
| `BREAKING CHANGE` | Major        |

### What happens on release

1. Package versions are bumped in all `package.json` files
2. `CHANGELOG.md` is updated with the new version's changes
3. A git commit and tag (e.g., `v0.2.0`) are created and pushed
4. GitHub Actions creates a GitHub Release
5. Packages are published to npm

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
