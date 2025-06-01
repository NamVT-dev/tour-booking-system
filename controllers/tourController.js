const Tour = require("../models/tourModel");

exports.getAllTours = async (req, res) => {
  try {
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

    // Tìm kiếm chung (name, summary, etc.)
    const searchConditions = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { summary: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { difficulty: { $regex: search, $options: "i" } },
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

    // Tổng hợp tất cả điều kiện
    const filterQuery = {
      ...searchConditions,
      ...locationConditions,
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
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};
