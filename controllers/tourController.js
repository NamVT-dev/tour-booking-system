const Tour = require("../models/tourModel");
const Review = require("../models/reviewModel");

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

// Get tour by slug
exports.getTourBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const tour = await Tour.findOne({ slug, status: "active" });

    if (!tour) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy tour.",
      });
    }

    // Tính ratings bằng aggregation
    const ratingsData = await Review.aggregate([
      { $match: { tour: tour._id } },
      {
        $group: {
          _id: "$tour",
          avgRating: { $avg: "$rating" },
          numRatings: { $sum: 1 },
        },
      },
    ]);

    const avgRating = ratingsData[0]?.avgRating || 0;
    const numRatings = ratingsData[0]?.numRatings || 0;

    const tourResponse = {
      name: tour.name,
      duration: tour.duration,
      maxGroupSize: tour.maxGroupSize,
      rating: Math.round(avgRating * 10) / 10,
      reviews: numRatings,
      price: tour.price,
      summary: tour.summary,
      description: tour.description,
      imageCover: tour.imageCover,
      images: tour.images,
      locations: tour.locations.map((loc) => ({
        type: loc.type,
        coordinates: loc.coordinates,
        address: loc.address,
        description: loc.description,
        day: loc.day,
      })),
    };

    res.status(200).json({
      status: 200,
      data: {
        tour: tourResponse,
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 500,
      message: err.message,
    });
  }
};

