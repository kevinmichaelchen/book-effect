import { NotFoundError, ParseError } from "@book-effect/core";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import type { HttpClientRequest } from "@effect/platform";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { GoogleBooksClient } from "./google-books.ts";

// ============================================================================
// Mock Data
// ============================================================================

const mockVolumeResponse = {
  totalItems: 1,
  items: [
    {
      id: "vol123",
      volumeInfo: {
        title: "The Pragmatic Programmer",
        subtitle: "From Journeyman to Master",
        authors: ["David Thomas", "Andrew Hunt"],
        publisher: "Addison-Wesley",
        publishedDate: "1999-10-20",
        pageCount: 352,
        imageLinks: {
          smallThumbnail: "http://books.google.com/small.jpg",
          thumbnail: "http://books.google.com/thumb.jpg",
        },
        industryIdentifiers: [
          { type: "ISBN_10", identifier: "020161622X" },
          { type: "ISBN_13", identifier: "9780201616224" },
        ],
      },
    },
  ],
};

const mockSearchResponse = {
  totalItems: 2,
  items: [
    {
      id: "vol1",
      volumeInfo: {
        title: "Clean Code",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2008-08-01",
        pageCount: 464,
        imageLinks: {
          thumbnail: "http://books.google.com/clean-code.jpg",
        },
        industryIdentifiers: [{ type: "ISBN_13", identifier: "9780132350884" }],
      },
    },
    {
      id: "vol2",
      volumeInfo: {
        title: "Clean Architecture",
        authors: ["Robert C. Martin"],
        publisher: "Prentice Hall",
        publishedDate: "2017-09-10",
        pageCount: 432,
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

// ============================================================================
// Tests
// ============================================================================

describe("GoogleBooksClient", () => {
  describe("getByIsbn", () => {
    it.effect("should fetch and transform a book by ISBN", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const book = yield* client.getByIsbn("9780201616224");

        expect(book.title).toBe("The Pragmatic Programmer");
        expect(book.authors).toHaveLength(2);
        expect(book.authors[0].name).toBe("David Thomas");
        expect(book.authors[1].name).toBe("Andrew Hunt");
        expect(book.publisher).toBe("Addison-Wesley");
        expect(book.publishDate).toBe("1999-10-20");
        expect(book.isbn10).toBe("020161622X");
        expect(book.isbn13).toBe("9780201616224");
        expect(book.pageCount).toBe(352);
        expect(book.coverImageUrl).toBe("https://books.google.com/thumb.jpg");
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient(mockVolumeResponse)),
      ));

    it.effect("should return NotFoundError when no items found", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const result = yield* client
          .getByIsbn("0000000000")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFoundError);
          expect((result.left as NotFoundError).identifier).toBe("0000000000");
          expect((result.left as NotFoundError).source).toBe("google-books");
        }
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient({ totalItems: 0 })),
      ));

    it.effect("should return NotFoundError when items array is empty", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const result = yield* client
          .getByIsbn("0000000000")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(NotFoundError);
        }
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient({ totalItems: 0, items: [] })),
      ));

    it.effect("should return ParseError for invalid response", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const result = yield* client
          .getByIsbn("9780201616224")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(ParseError);
          expect((result.left as ParseError).source).toBe("google-books");
        }
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient({ invalid: "response" })),
      ));

    it.effect("should convert HTTP to HTTPS for cover images", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const book = yield* client.getByIsbn("1234567890");

        expect(book.coverImageUrl).toBe("https://books.google.com/image.jpg");
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(
          createMockHttpClient({
            totalItems: 1,
            items: [
              {
                id: "vol1",
                volumeInfo: {
                  title: "Test Book",
                  imageLinks: {
                    thumbnail: "http://books.google.com/image.jpg",
                  },
                },
              },
            ],
          }),
        ),
      ));

    it.effect("should handle missing optional fields gracefully", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

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
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(
          createMockHttpClient({
            totalItems: 1,
            items: [
              {
                id: "vol1",
                volumeInfo: {
                  title: "Minimal Book",
                },
              },
            ],
          }),
        ),
      ));
  });

  describe("search", () => {
    it.effect("should search and transform multiple books", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const books = yield* client.search("clean code");

        expect(books).toHaveLength(2);
        expect(books[0].title).toBe("Clean Code");
        expect(books[0].authors[0].name).toBe("Robert C. Martin");
        expect(books[0].publisher).toBe("Prentice Hall");
        expect(books[0].publishDate).toBe("2008-08-01");
        expect(books[0].isbn13).toBe("9780132350884");
        expect(books[0].pageCount).toBe(464);
        expect(books[0].coverImageUrl).toBe(
          "https://books.google.com/clean-code.jpg",
        );

        expect(books[1].title).toBe("Clean Architecture");
        expect(books[1].coverImageUrl).toBeUndefined();
        expect(books[1].isbn10).toBeUndefined();
        expect(books[1].isbn13).toBeUndefined();
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient(mockSearchResponse)),
      ));

    it.effect("should return empty array when no results found", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const books = yield* client.search("xyznonexistent");

        expect(books).toHaveLength(0);
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(createMockHttpClient({ totalItems: 0 })),
      ));

    it.effect("should prefer thumbnail over smallThumbnail", () =>
      Effect.gen(function*() {
        const client = yield* GoogleBooksClient;

        const books = yield* client.search("test");

        expect(books[0].coverImageUrl).toBe(
          "https://books.google.com/thumb.jpg",
        );
      }).pipe(
        Effect.provide(GoogleBooksClient.Live),
        Effect.provide(
          createMockHttpClient({
            totalItems: 1,
            items: [
              {
                id: "vol1",
                volumeInfo: {
                  title: "Test Book",
                  imageLinks: {
                    smallThumbnail: "http://books.google.com/small.jpg",
                    thumbnail: "http://books.google.com/thumb.jpg",
                  },
                },
              },
            ],
          }),
        ),
      ));

    it.effect(
      "should fallback to smallThumbnail when thumbnail is missing",
      () =>
        Effect.gen(function*() {
          const client = yield* GoogleBooksClient;

          const books = yield* client.search("test");

          expect(books[0].coverImageUrl).toBe(
            "https://books.google.com/small.jpg",
          );
        }).pipe(
          Effect.provide(GoogleBooksClient.Live),
          Effect.provide(
            createMockHttpClient({
              totalItems: 1,
              items: [
                {
                  id: "vol1",
                  volumeInfo: {
                    title: "Test Book",
                    imageLinks: {
                      smallThumbnail: "http://books.google.com/small.jpg",
                    },
                  },
                },
              ],
            }),
          ),
        ),
    );
  });
});
