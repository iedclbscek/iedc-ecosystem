const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const parsePagination = (
  query = {},
  { defaultLimit = 20, maxLimit = 100 } = {},
) => {
  const page = positiveInteger(query.page, 1);
  const requestedLimit = positiveInteger(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);
  return { page, limit, skip: (page - 1) * limit };
};

export const paginationMeta = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page: Math.min(Math.max(1, page), totalPages),
    limit,
    total,
    totalPages,
  };
};
