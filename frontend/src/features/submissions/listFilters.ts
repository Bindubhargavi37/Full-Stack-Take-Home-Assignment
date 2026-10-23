// Options for the submissions list page (kept apart from the components for fast refresh).

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'oldest', label: 'Oldest first', sortBy: 'createdAt', sortOrder: 'asc' },
  { value: 'due', label: 'Highest amount due', sortBy: 'amountDue', sortOrder: 'desc' },
  { value: 'total', label: 'Highest total', sortBy: 'totalAmount', sortOrder: 'desc' },
  { value: 'customer', label: 'Customer A–Z', sortBy: 'customerName', sortOrder: 'asc' },
] as const;

/** The filters kept in the page URL, so they survive a reload and can be shared. */
export type FilterValues = {
  search: string;
  status: string;
  fromDate: string;
  toDate: string;
  sort: string;
};
