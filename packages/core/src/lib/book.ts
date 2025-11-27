import { Schema } from "effect";
import { Author } from "./author.ts";
import { ISBN10, ISBN13, Url } from "./branded.ts";

/**
 * Platform-agnostic book metadata schema.
 * Contains only fields universally available across
 * Open Library, Google Books, and Hardcover APIs.
 */
export const Book = Schema.Struct({
  /** Book title */
  title: Schema.NonEmptyString,

  /** List of authors */
  authors: Schema.Array(Author),

  /** Publisher name (normalized to single value) */
  publisher: Schema.optionalWith(Schema.NonEmptyString, { exact: true }),

  /** Publication date as string (format varies by source) */
  publishDate: Schema.optionalWith(Schema.String, { exact: true }),

  /** ISBN-10 identifier */
  isbn10: Schema.optionalWith(ISBN10, { exact: true }),

  /** ISBN-13 identifier */
  isbn13: Schema.optionalWith(ISBN13, { exact: true }),

  /** Number of pages */
  pageCount: Schema.optionalWith(Schema.Number.pipe(Schema.positive()), {
    exact: true,
  }),

  /** Cover image URL */
  coverImageUrl: Schema.optionalWith(Url, { exact: true }),
});

export type Book = typeof Book.Type;
