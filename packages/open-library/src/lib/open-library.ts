import {
  type Book,
  type BookApiClient,
  type ISBN10,
  type ISBN13,
  NetworkError,
  NotFoundError,
  ParseError,
  type Url,
} from "@book-effect/core";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import type { HttpClientError } from "@effect/platform";
import { Context, Effect, Layer, Schema } from "effect";

// ============================================================================
// Open Library API Response Schemas
// ============================================================================

/**
 * Schema for Open Library edition response (ISBN lookup).
 * https://openlibrary.org/isbn/{isbn}.json
 */
const OpenLibraryEditionResponse = Schema.Struct({
  title: Schema.String,
  authors: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        key: Schema.String,
      }),
    ),
    { exact: true },
  ),
  publishers: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  publish_date: Schema.optionalWith(Schema.String, { exact: true }),
  isbn_10: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  isbn_13: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  number_of_pages: Schema.optionalWith(Schema.Number, { exact: true }),
  covers: Schema.optionalWith(Schema.Array(Schema.Number), { exact: true }),
});

type OpenLibraryEditionResponse = typeof OpenLibraryEditionResponse.Type;

/**
 * Schema for Open Library search response.
 * https://openlibrary.org/search.json?q={query}
 */
const OpenLibrarySearchDoc = Schema.Struct({
  title: Schema.String,
  author_name: Schema.optionalWith(Schema.Array(Schema.String), {
    exact: true,
  }),
  publisher: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  first_publish_year: Schema.optionalWith(Schema.Number, { exact: true }),
  isbn: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  number_of_pages_median: Schema.optionalWith(Schema.Number, { exact: true }),
  cover_i: Schema.optionalWith(Schema.Number, { exact: true }),
});

type OpenLibrarySearchDoc = typeof OpenLibrarySearchDoc.Type;

const OpenLibrarySearchResponse = Schema.Struct({
  numFound: Schema.Number,
  docs: Schema.Array(OpenLibrarySearchDoc),
});

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Build a cover image URL from Open Library cover ID.
 */
const buildCoverUrl = (coverId: number): Url => `https://covers.openlibrary.org/b/id/${String(coverId)}-L.jpg` as Url;

/**
 * Extract ISBN-10 from an array of ISBNs.
 */
const extractIsbn10 = (isbns: readonly string[]): ISBN10 | undefined => {
  const match = isbns.find((isbn) => /^\d{9}[\dX]$/.test(isbn));
  return match as ISBN10 | undefined;
};

/**
 * Extract ISBN-13 from an array of ISBNs.
 */
const extractIsbn13 = (isbns: readonly string[]): ISBN13 | undefined => {
  const match = isbns.find((isbn) => /^\d{13}$/.test(isbn));
  return match as ISBN13 | undefined;
};

/**
 * Transform Open Library edition response to Book.
 */
const editionToBook = (edition: OpenLibraryEditionResponse): Book => {
  const publisher = edition.publishers?.[0];
  const publishDate = edition.publish_date;
  const isbn10 = edition.isbn_10?.[0] as ISBN10 | undefined;
  const isbn13 = edition.isbn_13?.[0] as ISBN13 | undefined;
  const pageCount = edition.number_of_pages;
  const coverImageUrl = edition.covers?.[0]
    ? buildCoverUrl(edition.covers[0])
    : undefined;

  return {
    title: edition.title,
    authors: (edition.authors ?? []).map((a) => ({
      name: a.key.replace("/authors/", ""),
    })),
    ...(publisher !== undefined && { publisher }),
    ...(publishDate !== undefined && { publishDate }),
    ...(isbn10 !== undefined && { isbn10 }),
    ...(isbn13 !== undefined && { isbn13 }),
    ...(pageCount !== undefined && { pageCount }),
    ...(coverImageUrl !== undefined && { coverImageUrl }),
  } as Book;
};

/**
 * Transform Open Library search doc to Book.
 */
const searchDocToBook = (doc: OpenLibrarySearchDoc): Book => {
  const publisher = doc.publisher?.[0];
  const publishDate = doc.first_publish_year?.toString();
  const isbn10 = doc.isbn ? extractIsbn10(doc.isbn) : undefined;
  const isbn13 = doc.isbn ? extractIsbn13(doc.isbn) : undefined;
  const pageCount = doc.number_of_pages_median;
  const coverImageUrl = doc.cover_i ? buildCoverUrl(doc.cover_i) : undefined;

  return {
    title: doc.title,
    authors: (doc.author_name ?? []).map((name) => ({ name })),
    ...(publisher !== undefined && { publisher }),
    ...(publishDate !== undefined && { publishDate }),
    ...(isbn10 !== undefined && { isbn10 }),
    ...(isbn13 !== undefined && { isbn13 }),
    ...(pageCount !== undefined && { pageCount }),
    ...(coverImageUrl !== undefined && { coverImageUrl }),
  } as Book;
};

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Map HTTP client errors to domain errors.
 */
const mapHttpError = (
  error: HttpClientError.HttpClientError,
  identifier: string,
): NetworkError | NotFoundError => {
  if (error._tag === "ResponseError" && error.response.status === 404) {
    return new NotFoundError({ identifier, source: "open-library" });
  }
  return new NetworkError({ message: error.message });
};

/**
 * Map parse errors to domain ParseError.
 */
const mapParseError = (error: unknown): ParseError =>
  new ParseError({
    message: error instanceof Error ? error.message : String(error),
    source: "open-library",
  });

// ============================================================================
// Open Library Client Service
// ============================================================================

const BASE_URL = "https://openlibrary.org";

/**
 * Create an Open Library BookApiClient implementation.
 */
const make = Effect.gen(function*() {
  const httpClient = yield* HttpClient.HttpClient;

  const getByIsbn: BookApiClient["getByIsbn"] = (isbn) =>
    Effect.gen(function*() {
      const request = HttpClientRequest.get(`${BASE_URL}/isbn/${isbn}.json`);

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError((e) => mapHttpError(e, isbn)),
        Effect.scoped,
      );

      const json = yield* HttpClientResponse.schemaBodyJson(
        OpenLibraryEditionResponse,
      )(response).pipe(Effect.mapError(mapParseError));

      return editionToBook(json);
    });

  const search: BookApiClient["search"] = (query) =>
    Effect.gen(function*() {
      const request = HttpClientRequest.get(`${BASE_URL}/search.json`).pipe(
        HttpClientRequest.setUrlParam("q", query),
        HttpClientRequest.setUrlParam("limit", "20"),
      );

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError((e) => mapHttpError(e, query)),
        Effect.scoped,
      );

      const json = yield* HttpClientResponse.schemaBodyJson(
        OpenLibrarySearchResponse,
      )(response).pipe(Effect.mapError(mapParseError));

      return json.docs.map(searchDocToBook);
    });

  return { getByIsbn, search } satisfies BookApiClient;
});

/**
 * Open Library client service tag.
 */
export class OpenLibraryClient extends Context.Tag("OpenLibraryClient")<
  OpenLibraryClient,
  BookApiClient
>() {
  /**
   * Live layer that requires HttpClient.
   */
  static readonly Live = Layer.effect(this, make);
}
