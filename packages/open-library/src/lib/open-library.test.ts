import { ParseError } from "@book-effect/core";
import { HttpClient, HttpClientResponse } from "@effect/platform";
import type { HttpClientRequest } from "@effect/platform";
import { describe, expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { OpenLibraryClient } from "./open-library.ts";

// ============================================================================
// Mock Data
// ============================================================================

const mockEditionResponse = {
  title: "The Pragmatic Programmer",
  authors: [{ key: "/authors/OL123A" }],
  publishers: ["Addison-Wesley"],
  publish_date: "1999",
  isbn_10: ["020161622X"],
  isbn_13: ["9780201616224"],
  number_of_pages: 352,
  covers: [12345],
};

const mockSearchResponse = {
  numFound: 2,
  docs: [
    {
      title: "Clean Code",
      author_name: ["Robert C. Martin"],
      publisher: ["Prentice Hall"],
      first_publish_year: 2008,
      isbn: ["9780132350884", "0132350882"],
      number_of_pages_median: 464,
      cover_i: 67890,
    },
    {
      title: "Clean Architecture",
      author_name: ["Robert C. Martin"],
      publisher: ["Prentice Hall"],
      first_publish_year: 2017,
      isbn: ["9780134494166"],
      number_of_pages_median: 432,
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

describe("OpenLibraryClient", () => {
  describe("getByIsbn", () => {
    it.effect("should fetch and transform a book by ISBN", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

        const book = yield* client.getByIsbn("9780201616224");

        expect(book.title).toBe("The Pragmatic Programmer");
        expect(book.authors).toHaveLength(1);
        expect(book.publisher).toBe("Addison-Wesley");
        expect(book.publishDate).toBe("1999");
        expect(book.isbn10).toBe("020161622X");
        expect(book.isbn13).toBe("9780201616224");
        expect(book.pageCount).toBe(352);
        expect(book.coverImageUrl).toBe(
          "https://covers.openlibrary.org/b/id/12345-L.jpg",
        );
      }).pipe(
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(createMockHttpClient(mockEditionResponse)),
      ));

    it.effect("should return ParseError for invalid response", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

        const result = yield* client
          .getByIsbn("9780201616224")
          .pipe(Effect.either);

        expect(result._tag).toBe("Left");
        if (result._tag === "Left") {
          expect(result.left).toBeInstanceOf(ParseError);
          expect((result.left as ParseError).source).toBe("open-library");
        }
      }).pipe(
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(createMockHttpClient({ invalid: "response" })),
      ));

    it.effect("should handle missing optional fields gracefully", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

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
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(createMockHttpClient({ title: "Minimal Book" })),
      ));
  });

  describe("search", () => {
    it.effect("should search and transform multiple books", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

        const books = yield* client.search("clean code");

        expect(books).toHaveLength(2);
        expect(books[0].title).toBe("Clean Code");
        expect(books[0].authors[0].name).toBe("Robert C. Martin");
        expect(books[0].publisher).toBe("Prentice Hall");
        expect(books[0].publishDate).toBe("2008");
        expect(books[0].isbn13).toBe("9780132350884");
        expect(books[0].isbn10).toBe("0132350882");
        expect(books[0].pageCount).toBe(464);
        expect(books[0].coverImageUrl).toBe(
          "https://covers.openlibrary.org/b/id/67890-L.jpg",
        );

        expect(books[1].title).toBe("Clean Architecture");
        expect(books[1].coverImageUrl).toBeUndefined();
      }).pipe(
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(createMockHttpClient(mockSearchResponse)),
      ));

    it.effect("should return empty array when no results found", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

        const books = yield* client.search("xyznonexistent");

        expect(books).toHaveLength(0);
      }).pipe(
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(createMockHttpClient({ numFound: 0, docs: [] })),
      ));

    it.effect("should extract correct ISBN formats from mixed array", () =>
      Effect.gen(function*() {
        const client = yield* OpenLibraryClient;

        const books = yield* client.search("test");

        expect(books[0].isbn10).toBe("0132350882");
        expect(books[0].isbn13).toBe("9780132350884");
      }).pipe(
        Effect.provide(OpenLibraryClient.Live),
        Effect.provide(
          createMockHttpClient({
            numFound: 1,
            docs: [
              {
                title: "Test Book",
                isbn: ["invalid", "0132350882", "9780132350884", "short"],
              },
            ],
          }),
        ),
      ));
  });
});
