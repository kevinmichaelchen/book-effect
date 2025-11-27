import { Context, Effect } from "effect";
import type { Book } from "./book.ts";
import type { BookApiError } from "./errors.ts";

/**
 * Book API client service interface.
 * Provides platform-agnostic methods for fetching book metadata.
 */
export interface BookApiClient {
  /**
   * Fetch a book by its ISBN (10 or 13 digit).
   */
  readonly getByIsbn: (isbn: string) => Effect.Effect<Book, BookApiError>;

  /**
   * Search for books by query string.
   */
  readonly search: (query: string) => Effect.Effect<readonly Book[], BookApiError>;
}

/**
 * Context tag for the BookApiClient service.
 */
export const BookApiClient = Context.GenericTag<BookApiClient>("BookApiClient");
