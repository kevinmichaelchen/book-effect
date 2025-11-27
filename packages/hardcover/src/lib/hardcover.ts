import {
  type Book,
  type BookApiClient,
  type ISBN10,
  type ISBN13,
  NetworkError,
  NotFoundError,
  ParseError,
  RateLimitError,
  type Url,
} from "@book-effect/core";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "@effect/platform";
import type { HttpClientError } from "@effect/platform";
import { Config, ConfigError, Context, Effect, Layer, Schema } from "effect";

// ============================================================================
// Hardcover GraphQL API Response Schemas
// ============================================================================

/**
 * Schema for a book from Hardcover search results.
 */
const HardcoverBookResult = Schema.Struct({
  id: Schema.Number,
  title: Schema.String,
  subtitle: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  slug: Schema.String,
  release_year: Schema.optionalWith(Schema.NullOr(Schema.Number), {
    exact: true,
  }),
  pages: Schema.optionalWith(Schema.NullOr(Schema.Number), { exact: true }),
  author_names: Schema.optionalWith(Schema.Array(Schema.String), {
    exact: true,
  }),
  image: Schema.optionalWith(Schema.NullOr(Schema.String), { exact: true }),
  isbns: Schema.optionalWith(Schema.Array(Schema.String), { exact: true }),
});

type HardcoverBookResult = typeof HardcoverBookResult.Type;

/**
 * Schema for Hardcover search API response.
 */
const HardcoverSearchResponse = Schema.Struct({
  results: Schema.Array(HardcoverBookResult),
  ids: Schema.Array(Schema.Number),
  query: Schema.String,
  query_type: Schema.String,
  page: Schema.Number,
  per_page: Schema.Number,
});

/**
 * Schema for the GraphQL response wrapper.
 */
const HardcoverGraphQLResponse = Schema.Struct({
  data: Schema.optionalWith(
    Schema.Struct({
      search: HardcoverSearchResponse,
    }),
    { exact: true },
  ),
  errors: Schema.optionalWith(
    Schema.Array(
      Schema.Struct({
        message: Schema.String,
        extensions: Schema.optionalWith(
          Schema.Struct({
            code: Schema.optionalWith(Schema.String, { exact: true }),
          }),
          { exact: true },
        ),
      }),
    ),
    { exact: true },
  ),
});

// ============================================================================
// GraphQL Queries
// ============================================================================

const SEARCH_QUERY = `
  query Search($query: String!, $query_type: String!, $per_page: Int!) {
    search(query: $query, query_type: $query_type, per_page: $per_page) {
      results
      ids
      query
      query_type
      page
      per_page
    }
  }
`;

// ============================================================================
// Transformation Functions
// ============================================================================

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
 * Transform Hardcover book result to Book.
 */
const resultToBook = (result: HardcoverBookResult): Book => {
  const publishDate = result.release_year != null ? result.release_year.toString() : undefined;
  const isbn10 = result.isbns ? extractIsbn10(result.isbns) : undefined;
  const isbn13 = result.isbns ? extractIsbn13(result.isbns) : undefined;
  const pageCount = result.pages ?? undefined;
  const coverImageUrl = (result.image ?? undefined) as Url | undefined;

  return {
    title: result.title,
    authors: (result.author_names ?? []).map((name) => ({ name })),
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

type HardcoverError =
  | NetworkError
  | NotFoundError
  | ParseError
  | RateLimitError;

/**
 * Map HTTP client errors to domain errors.
 */
const mapHttpError = (
  error: HttpClientError.HttpClientError,
  identifier: string,
): HardcoverError => {
  if (error._tag === "ResponseError") {
    if (error.response.status === 404) {
      return new NotFoundError({ identifier, source: "hardcover" });
    }
    if (error.response.status === 429) {
      return new RateLimitError({ source: "hardcover" });
    }
  }
  return new NetworkError({ message: error.message });
};

/**
 * Map parse errors to domain ParseError.
 */
const mapParseError = (error: unknown): ParseError =>
  new ParseError({
    message: error instanceof Error ? error.message : String(error),
    source: "hardcover",
  });

/**
 * Check for GraphQL errors in the response.
 */
const checkGraphQLErrors = (
  response: typeof HardcoverGraphQLResponse.Type,
): Effect.Effect<void, ParseError | RateLimitError> => {
  if (response.errors && response.errors.length > 0) {
    const error = response.errors[0];
    if (error.extensions?.code === "RATE_LIMITED") {
      return Effect.fail(new RateLimitError({ source: "hardcover" }));
    }
    return Effect.fail(
      new ParseError({ message: error.message, source: "hardcover" }),
    );
  }
  return Effect.void;
};

// ============================================================================
// Hardcover Client Service
// ============================================================================

const GRAPHQL_ENDPOINT = "https://api.hardcover.app/v1/graphql";

/**
 * Configuration for Hardcover API.
 */
export class HardcoverConfig extends Context.Tag("HardcoverConfig")<
  HardcoverConfig,
  { readonly apiKey: string }
>() {
  /**
   * Layer that reads API key from environment variable.
   */
  static readonly FromEnv: Layer.Layer<HardcoverConfig, ConfigError.ConfigError> = Layer.effect(
    this,
    Effect.gen(function*() {
      const apiKey = yield* Config.string("HARDCOVER_API_KEY");
      return { apiKey };
    }),
  );

  /**
   * Layer for testing with a provided API key.
   */
  static readonly make = (apiKey: string): Layer.Layer<HardcoverConfig> => Layer.succeed(this, { apiKey });
}

/**
 * Create a Hardcover BookApiClient implementation.
 */
const make = Effect.gen(function*() {
  const httpClient = yield* HttpClient.HttpClient;
  const config = yield* HardcoverConfig;

  const executeGraphQL = <T>(
    query: string,
    variables: Record<string, unknown>,
    schema: Schema.Schema<T>,
    identifier: string,
  ): Effect.Effect<T, HardcoverError> =>
    Effect.gen(function*() {
      const baseRequest = HttpClientRequest.post(GRAPHQL_ENDPOINT).pipe(
        HttpClientRequest.setHeader("Content-Type", "application/json"),
        HttpClientRequest.setHeader("authorization", config.apiKey),
      );

      const request = yield* HttpClientRequest.bodyJson(baseRequest, {
        query,
        variables,
      }).pipe(Effect.mapError((e): HardcoverError => mapParseError(e)));

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError((e) => mapHttpError(e, identifier)),
        Effect.scoped,
      );

      const json = yield* HttpClientResponse.schemaBodyJson(schema)(
        response,
      ).pipe(Effect.mapError((e): HardcoverError => mapParseError(e)));

      return json;
    });

  const getByIsbn: BookApiClient["getByIsbn"] = (isbn) =>
    Effect.gen(function*() {
      const response = yield* executeGraphQL(
        SEARCH_QUERY,
        { query: isbn, query_type: "book", per_page: 1 },
        HardcoverGraphQLResponse,
        isbn,
      );

      yield* checkGraphQLErrors(response);

      if (!response.data || response.data.search.results.length === 0) {
        return yield* Effect.fail(
          new NotFoundError({ identifier: isbn, source: "hardcover" }),
        );
      }

      return resultToBook(response.data.search.results[0]);
    });

  const search: BookApiClient["search"] = (query) =>
    Effect.gen(function*() {
      const response = yield* executeGraphQL(
        SEARCH_QUERY,
        { query, query_type: "book", per_page: 20 },
        HardcoverGraphQLResponse,
        query,
      );

      yield* checkGraphQLErrors(response);

      if (!response.data) {
        return [];
      }

      return response.data.search.results.map(resultToBook);
    });

  return { getByIsbn, search } satisfies BookApiClient;
});

/**
 * Hardcover client service tag.
 */
export class HardcoverClient extends Context.Tag("HardcoverClient")<
  HardcoverClient,
  BookApiClient
>() {
  /**
   * Live layer that requires HttpClient and HardcoverConfig.
   */
  static readonly Live = Layer.effect(this, make);
}
