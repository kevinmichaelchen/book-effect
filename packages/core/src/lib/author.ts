import { Schema } from "effect";

/**
 * Author schema representing a book author or contributor.
 */
export const Author = Schema.Struct({
  /** Full name of the author */
  name: Schema.NonEmptyString,
});

export type Author = typeof Author.Type;
