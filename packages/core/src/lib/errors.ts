import { Schema } from "effect";

/**
 * API source identifier for error attribution.
 */
export const Source = Schema.Literal("open-library", "google-books", "hardcover");
export type Source = typeof Source.Type;

/**
 * Network-level error (connection issues, timeouts).
 */
export class NetworkError extends Schema.TaggedError<NetworkError>()(
  "NetworkError",
  {
    message: Schema.String,
  },
) {}

/**
 * Resource not found error.
 */
export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFoundError",
  {
    identifier: Schema.String,
    source: Source,
  },
) {}

/**
 * Response parsing error.
 */
export class ParseError extends Schema.TaggedError<ParseError>()(
  "ParseError",
  {
    message: Schema.String,
    source: Source,
  },
) {}

/**
 * Rate limiting error.
 */
export class RateLimitError extends Schema.TaggedError<RateLimitError>()(
  "RateLimitError",
  {
    retryAfterSeconds: Schema.optionalWith(Schema.Number, { exact: true }),
    source: Source,
  },
) {}

/**
 * Union of all book API errors.
 */
export type BookApiError =
  | NetworkError
  | NotFoundError
  | ParseError
  | RateLimitError;
