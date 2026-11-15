export interface ComplaintQueryParams {
  status?: string;
  q?: string;
  sortBy?: string;
  order?: string;
  page?: number | string;
  limit?: number | string;
  hostelId?: any;
}

export interface ComplaintQueryResult {
  filter: Record<string, any>;
  sort: Record<string, 1 | -1>;
  skip: number;
  limit: number;
}

const ALLOWED_SORT_FIELDS = ['createdAt', 'subject', 'raisedByName', 'roomNo', 'status'] as const;

export function buildComplaintQuery(params: ComplaintQueryParams = {}): ComplaintQueryResult {
  const filter: Record<string, any> = {};

  if (params.hostelId) {
    filter.hostelId = params.hostelId;
  }

  // Status: defaults to OPEN. If ALL, do not filter by status. ACTIVE maps to OPEN.
  const statusParam = params.status?.trim().toUpperCase();
  if (!statusParam || statusParam === 'OPEN' || statusParam === 'ACTIVE') {
    filter.status = 'OPEN';
  } else if (statusParam === 'CLOSED') {
    filter.status = 'CLOSED';
  }

  // Search query (q): escape regex special characters; search subject, description, raisedByName, roomNo
  if (params.q && typeof params.q === 'string' && params.q.trim()) {
    const escaped = params.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { subject: { $regex: escaped, $options: 'i' } },
      { description: { $regex: escaped, $options: 'i' } },
      { raisedByName: { $regex: escaped, $options: 'i' } },
      { roomNo: { $regex: escaped, $options: 'i' } },
    ];
  }

  // Sort: whitelist fields, fallback to createdAt desc (-1)
  const sortBy = ALLOWED_SORT_FIELDS.includes(params.sortBy as any)
    ? (params.sortBy as string)
    : 'createdAt';
  const order: 1 | -1 = params.order?.toLowerCase() === 'asc' ? 1 : -1;
  const sort: Record<string, 1 | -1> = { [sortBy]: order };

  // Limit: default 10, cap at 50, minimum 1
  const parsedLimit = parseInt(String(params.limit), 10);
  const limit = Math.min(Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit), 50);

  // Page and Skip: default page 1, minimum 1
  const parsedPage = parseInt(String(params.page), 10);
  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const skip = (page - 1) * limit;

  return { filter, sort, skip, limit };
}
