/** Shape of a paginated collection returned by list endpoints. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Error body most JSON APIs return. Adjust to match your backend. */
export interface ApiErrorBody {
  message?: string
  code?: string
  details?: Record<string, string[]>
}
