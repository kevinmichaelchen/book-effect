import { Schema } from "effect";

/**
 * ISBN-10 branded type with validation.
 * Format: 9 digits followed by a digit or 'X' (checksum).
 */
export const ISBN10 = Schema.String.pipe(
  Schema.pattern(/^\d{9}[\dX]$/),
  Schema.brand("ISBN10"),
);
export type ISBN10 = typeof ISBN10.Type;

/**
 * ISBN-13 branded type with validation.
 * Format: 13 digits (typically starting with 978 or 979).
 */
export const ISBN13 = Schema.String.pipe(
  Schema.pattern(/^\d{13}$/),
  Schema.brand("ISBN13"),
);
export type ISBN13 = typeof ISBN13.Type;

/**
 * Generic book identifier branded type.
 * Can be an ISBN, OLID, or other platform-specific ID.
 */
export const BookId = Schema.String.pipe(
  Schema.nonEmptyString(),
  Schema.brand("BookId"),
);
export type BookId = typeof BookId.Type;

/**
 * URL branded type with basic validation.
 * Must start with http:// or https://.
 */
export const Url = Schema.String.pipe(
  Schema.pattern(/^https?:\/\/.+/),
  Schema.brand("Url"),
);
export type Url = typeof Url.Type;
