const catchAsync = require("../utils/catchAsync");
const Tour = require("../models/tourModel");
// eslint-disable-next-line no-unused-vars
const getAllTours = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = "-createdAt",
    search = "",
    minPrice,
    maxPrice,
    location,
  } = req.query;

  const skip = (page - 1) * limit;

  // Tìm kiếm chung
  const searchConditions = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { summary: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  // Lọc theo giá
  const priceConditions = {};
  if (minPrice) priceConditions.$gte = Number(minPrice);
  if (maxPrice) priceConditions.$lte = Number(maxPrice);

  // Lọc theo địa điểm
  const locationConditions = location
    ? {
        $or: [
          {
            "startLocation.description": { $regex: location, $options: "i" },
          },
          { "locations.description": { $regex: location, $options: "i" } },
        ],
      }
    : {};

  // Tổng hợp điều kiện
  const filterQuery = {
    ...searchConditions,
    ...locationConditions,
    status: "active",
  };

  if (Object.keys(priceConditions).length > 0) {
    filterQuery.price = priceConditions;
  }

  // Truy vấn database
  const tours = await Tour.find(filterQuery)
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Tour.countDocuments(filterQuery);

  res.status(200).json({
    status: "success",
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    results: tours.length,
    data: {
      tours,
    },
  });
});

module.exports = {
  getAllTours,
};
