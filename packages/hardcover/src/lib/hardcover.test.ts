import { NotFoundError, ParseError, RateLimitError } from "@book-effect/core";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import type { HttpClientRequest } from "@effect/platform";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HardcoverClient, HardcoverConfig } from "./hardcover.ts";

// ============================================================================
// Mock Data
// ============================================================================

const mockSearchResponse = {
  data: {
    search: {
      results: [
        {
          id: 123,
          title: "The Pragmatic Programmer",
          subtitle: "From Journeyman to Master",
          slug: "the-pragmatic-programmer",
          release_year: 1999,
          pages: 352,
          author_names: ["David Thomas", "Andrew Hunt"],
          image: "https://hardcover.app/images/book-123.jpg",
          isbns: ["020161622X", "9780201616224"],
        },
      ],
      ids: [123],
      query: "9780201616224",
      query_type: "book",
      page: 1,
      per_page: 1,
    },
  },
};

const mockMultipleResultsResponse = {
  data: {
    search: {
      results: [
        {
          id: 1,
          title: "Clean Code",
          subtitle: null,
          slug: "clean-code",
          release_year: 2008,
          pages: 464,
          author_names: ["Robert C. Martin"],
          image: "https://hardcover.app/images/clean-code.jpg",
          isbns: ["9780132350884", "0132350882"],
        },
        {
          id: 2,
          title: "Clean Architecture",
          subtitle: "A Craftsman's Guide",
          slug: "clean-architecture",
          release_year: 2017,
          pages: 432,
          author_names: ["Robert C. Martin"],
          image: null,
          isbns: ["9780134494166"],
        },
      ],
      ids: [1, 2],
      query: "clean code",
      query_type: "book",
      page: 1,
      per_page: 20,
    },
  },
};

const mockEmptyResponse = {
  data: {
    search: {
      results: [],
      ids: [],
      query: "nonexistent",
      query_type: "book",
      page: 1,
      per_page: 1,
    },
  },
};

const mockGraphQLErrorResponse = {
  errors: [
    {
      message: "Invalid query",
      extensions: {
        code: "BAD_USER_INPUT",
      },
    },
  ],
};

const mockRateLimitErrorResponse = {
  errors: [
    {
      message: "Rate limit exceeded",
      extensions: {
        code: "RATE_LIMITED",
      },
    },
  ],
};

// ============================================================================
// Mock HTTP Client Layer
// ============================================================================

const createMockHttpClient = (responseBody: unknown) =>
  Layer.succeed(HttpClient.HttpClient, {
    execute: (request: HttpClientRequest.HttpClientRequest) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify(responseBody), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
  } as unknown as HttpClient.HttpClient);

const testConfig = HardcoverConfig.make("test-api-key");

// ============================================================================
// Tests
// ============================================================================

describe("HardcoverClient", () => {
  describe("getByIsbn", () => {
    it.effect("should fetch and transform a book by ISBN", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const book = yield* client.getByIsbn("9780201616224");

        expect(book.title).toBe("The Pragmatic Programmer");
        expect(book.authors).toHaveLength(2);
        expect(book.authors[0].name).toBe("David Thomas");
        expect(book.authors[1].name).toBe("Andrew Hunt");
        expect(book.publisher).toBeUndefined(); // Hardcover doesn't return publisher in search
        expect(book.publishDate).toBe("1999");
        expect(book.isbn10).toBe("020161622X");
        expect(book.isbn13).toBe("9780201616224");
        expect(book.pageCount).toBe(352);
        expect(book.coverImageUrl).toBe(
          "https://hardcover.app/images/book-123.jpg",
        );
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockSearchResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should return NotFoundError when no results found", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const result = yield* client
          .getByIsbn("0000000000")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFoundError);
          expect((result.left as NotFoundError).identifier).toBe("0000000000");
          expect((result.left as NotFoundError).source).toBe("hardcover");
        }
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockEmptyResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should return ParseError for GraphQL errors", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const result = yield* client
          .getByIsbn("9780201616224")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(ParseError);
          expect((result.left as ParseError).source).toBe("hardcover");
          expect((result.left as ParseError).message).toBe("Invalid query");
        }
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockGraphQLErrorResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should return RateLimitError for rate limit responses", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const result = yield* client
          .getByIsbn("9780201616224")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(RateLimitError);
          expect((result.left as RateLimitError).source).toBe("hardcover");
        }
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockRateLimitErrorResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should return NotFoundError for response missing data", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const result = yield* client
          .getByIsbn("9780201616224")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          // When response is missing the data field, it's treated as not found
          expect(result.left).toBeInstanceOf(NotFoundError);
          expect((result.left as NotFoundError).source).toBe("hardcover");
        }
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient({ invalid: "response" })),
        Effect.provide(testConfig),
      ));

    it.effect("should handle missing optional fields gracefully", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const book = yield* client.getByIsbn("1234567890");

        expect(book.title).toBe("Minimal Book");
        expect(book.authors).toHaveLength(0);
        expect(book.publisher).toBeUndefined();
        expect(book.publishDate).toBeUndefined();
        expect(book.isbn10).toBeUndefined();
        expect(book.isbn13).toBeUndefined();
        expect(book.pageCount).toBeUndefined();
        expect(book.coverImageUrl).toBeUndefined();
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(
          createMockHttpClient({
            data: {
              search: {
                results: [
                  {
                    id: 1,
                    title: "Minimal Book",
                    slug: "minimal-book",
                  },
                ],
                ids: [1],
                query: "minimal",
                query_type: "book",
                page: 1,
                per_page: 1,
              },
            },
          }),
        ),
        Effect.provide(testConfig),
      ));
  });

  describe("search", () => {
    it.effect("should search and transform multiple books", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const books = yield* client.search("clean code");

        expect(books).toHaveLength(2);
        expect(books[0].title).toBe("Clean Code");
        expect(books[0].authors[0].name).toBe("Robert C. Martin");
        expect(books[0].publishDate).toBe("2008");
        expect(books[0].isbn13).toBe("9780132350884");
        expect(books[0].isbn10).toBe("0132350882");
        expect(books[0].pageCount).toBe(464);
        expect(books[0].coverImageUrl).toBe(
          "https://hardcover.app/images/clean-code.jpg",
        );

        expect(books[1].title).toBe("Clean Architecture");
        expect(books[1].coverImageUrl).toBeUndefined();
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockMultipleResultsResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should return empty array when no results found", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const books = yield* client.search("xyznonexistent");

        expect(books).toHaveLength(0);
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(createMockHttpClient(mockEmptyResponse)),
        Effect.provide(testConfig),
      ));

    it.effect("should extract correct ISBN formats from mixed array", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const books = yield* client.search("test");

        expect(books[0].isbn10).toBe("0132350882");
        expect(books[0].isbn13).toBe("9780132350884");
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(
          createMockHttpClient({
            data: {
              search: {
                results: [
                  {
                    id: 1,
                    title: "Test Book",
                    slug: "test-book",
                    isbns: ["invalid", "0132350882", "9780132350884", "short"],
                  },
                ],
                ids: [1],
                query: "test",
                query_type: "book",
                page: 1,
                per_page: 20,
              },
            },
          }),
        ),
        Effect.provide(testConfig),
      ));

    it.effect("should handle null values in optional fields", () =>
      Effect.gen(function*() {
        const client = yield* HardcoverClient;

        const books = yield* client.search("test");

        expect(books[0].title).toBe("Test Book");
        expect(books[0].publishDate).toBeUndefined();
        expect(books[0].pageCount).toBeUndefined();
        expect(books[0].coverImageUrl).toBeUndefined();
      }).pipe(
        Effect.provide(HardcoverClient.Live),
        Effect.provide(
          createMockHttpClient({
            data: {
              search: {
                results: [
                  {
                    id: 1,
                    title: "Test Book",
                    subtitle: null,
                    slug: "test-book",
                    release_year: null,
                    pages: null,
                    author_names: [],
                    image: null,
                    isbns: [],
                  },
                ],
                ids: [1],
                query: "test",
                query_type: "book",
                page: 1,
                per_page: 20,
              },
            },
          }),
        ),
        Effect.provide(testConfig),
      ));
  });
});
