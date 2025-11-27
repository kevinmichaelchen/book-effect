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
// Google Books API Response Schemas
// ============================================================================

/**
 * Schema for a single volume's information.
 */
const GoogleBooksVolumeInfo = Schema.Struct({
  title: Schema.String,
  subtitle: Schema.optionalWith(Schema.String, { exact: true }),
  authors: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
  publisher: Schema.optionalWith(Schema.String, { exact: true }),
  publishedDate: Schema.optionalWith(Schema.String, { exact: true }),
  pageCount: Schema.optionalWith(Schema.Number, { exact: true }),
  imageLinks: Schema.optionalWith(
    Schema.Struct({
      smallThumbnail: Schema.optionalWith(Schema.String, { exact: true }),
      thumbnail: Schema.optionalWith(Schema.String, { exact: true }),
    }),
    { exact: true },
  ),
  industryIdentifiers: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        type: Schema.String,
        identifier: Schema.String,
      }),
    ),
    { exact: true },
  ),
});

type GoogleBooksVolumeInfo = typeof GoogleBooksVolumeInfo.Type;

/**
 * Schema for a single volume item.
 */
const GoogleBooksVolume = Schema.Struct({
  id: Schema.String,
  volumeInfo: GoogleBooksVolumeInfo,
});

type GoogleBooksVolume = typeof GoogleBooksVolume.Type;

/**
 * Schema for Google Books API volumes list response.
 */
const GoogleBooksResponse = Schema.Struct({
  totalItems: Schema.Number,
  items: Schema.optionalWith(Schema.Array(GoogleBooksVolume), { exact: true }),
});

// ============================================================================
// Transformation Functions
// ============================================================================

/**
 * Extract ISBN-10 from industry identifiers.
 */
const extractIsbn10 = (
  identifiers: readonly { type: string; identifier: string }[] | undefined,
): ISBN10 | undefined => {
  const id = identifiers?.find((id) => id.type === "ISBN_10")?.identifier;
  return id as ISBN10 | undefined;
};

/**
 * Extract ISBN-13 from industry identifiers.
 */
const extractIsbn13 = (
  identifiers: readonly { type: string; identifier: string }[] | undefined,
): ISBN13 | undefined => {
  const id = identifiers?.find((id) => id.type === "ISBN_13")?.identifier;
  return id as ISBN13 | undefined;
};

/**
 * Get the best available cover image URL.
 * Google Books uses HTTP URLs, we convert them to HTTPS.
 */
const getCoverImageUrl = (
  imageLinks: GoogleBooksVolumeInfo["imageLinks"],
): Url | undefined => {
  const url = imageLinks?.thumbnail ?? imageLinks?.smallThumbnail;
  return url?.replace("http://", "https://") as Url | undefined;
};

/**
 * Transform Google Books volume to Book.
 */
const volumeToBook = (volume: GoogleBooksVolume): Book => {
  const info = volume.volumeInfo;
  const publisher = info.publisher;
  const publishDate = info.publishedDate;
  const isbn10 = extractIsbn10(info.industryIdentifiers);
  const isbn13 = extractIsbn13(info.industryIdentifiers);
  const pageCount = info.pageCount;
  const coverImageUrl = getCoverImageUrl(info.imageLinks);

  return {
    title: info.title,
    authors: (info.authors ?? []).map((name) => ({ name })),
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
    return new NotFoundError({ identifier, source: "google-books" });
  }
  return new NetworkError({ message: error.message });
};

/**
 * Map parse errors to domain ParseError.
 */
const mapParseError = (error: unknown): ParseError =>
  new ParseError({
    message: error instanceof Error ? error.message : String(error),
    source: "google-books",
  });

// ============================================================================
// Google Books Client Service
// ============================================================================

const BASE_URL = "https://www.googleapis.com/books/v1";

/**
 * Create a Google Books BookApiClient implementation.
 */
const make = Effect.gen(function*() {
  const httpClient = yield* HttpClient.HttpClient;

  const getByIsbn: BookApiClient["getByIsbn"] = (isbn) =>
    Effect.gen(function*() {
      const request = HttpClientRequest.get(`${BASE_URL}/volumes`).pipe(
        HttpClientRequest.setUrlParam("q", `isbn:${isbn}`),
      );

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError((e) => mapHttpError(e, isbn)),
        Effect.scoped,
      );

      const json = yield* HttpClientResponse.schemaBodyJson(
        GoogleBooksResponse,
      )(response).pipe(Effect.mapError(mapParseError));

      if (json.totalItems === 0 || !json.items || json.items.length === 0) {
        return yield* Effect.fail(
          new NotFoundError({ identifier: isbn, source: "google-books" }),
        );
      }

      return volumeToBook(json.items[0]);
    });

  const search: BookApiClient["search"] = (query) =>
    Effect.gen(function*() {
      const request = HttpClientRequest.get(`${BASE_URL}/volumes`).pipe(
        HttpClientRequest.setUrlParam("q", query),
        HttpClientRequest.setUrlParam("maxResults", "20"),
      );

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError((e) => mapHttpError(e, query)),
        Effect.scoped,
      );

      const json = yield* HttpClientResponse.schemaBodyJson(
        GoogleBooksResponse,
      )(response).pipe(Effect.mapError(mapParseError));

      return (json.items ?? []).map(volumeToBook);
    });

  return { getByIsbn, search } satisfies BookApiClient;
});

/**
 * Google Books client service tag.
 */
export class GoogleBooksClient extends Context.Tag("GoogleBooksClient")<
  GoogleBooksClient,
  BookApiClient
>() {
  /**
   * Live layer that requires HttpClient.
   */
  static readonly Live = Layer.effect(this, make);
}
