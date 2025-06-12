exports.buildPaginatedQuery = ({
  query,
  filters = {},
  searchFields = [],
  page = 1,
  limit = 10,
  select = "",
  sort = "-createdAt",
}) => {
  const finalQuery = { ...filters };

  if (query.search && searchFields.length > 0) {
    finalQuery.$or = searchFields.map((field) => ({
      [field]: { $regex: query.search, $options: "i" },
    }));
  }

  const skip = (Number(page) - 1) * Number(limit);

  return {
    finalQuery,
    paginationOptions: {
      skip,
      limit: Number(limit),
      select,
      sort,
    },
  };
};
