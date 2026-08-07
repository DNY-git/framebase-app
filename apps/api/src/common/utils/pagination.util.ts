import { PaginationOptions, PaginatedResponse } from '@constructtrack/types';

/**
 * Helper to parse pagination query parameters into a standardized options object.
 */
export function parsePagination(page?: string, perPage?: string): PaginationOptions {
  return {
    page: page ? parseInt(page, 10) : 1,
    perPage: perPage ? parseInt(perPage, 10) : 20,
  };
}

/**
 * Helper to format a PaginatedResponse into the standardized API envelope.
 */
export function formatPaginatedResponse<T>(result: PaginatedResponse<T>) {
  return {
    data: result.items,
    meta: {
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
    },
  };
}
