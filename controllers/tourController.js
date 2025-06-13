const multer = require("multer");
const sharp = require("sharp");

const Tour = require("../models/tourModel");
const Review = require("../models/reviewModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { uploadToCloudinary } = require("../config/cloudinary");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "images", maxCount: 5 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files?.imageCover || !req.files?.images) return next();
  // 1) Cover image
  const coverFilename = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  const buffer = await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toBuffer();

  const uploadCover = await uploadToCloudinary("tours", buffer, coverFilename);
  req.body.imageCover = uploadCover.secure_url;
  // 2) Images
  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      const buffer = await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toBuffer(); // Chuyển thành buffer

      const uploadedImage = await uploadToCloudinary("tours", buffer, filename);
      req.body.images.push(uploadedImage.secure_url); // Lưu URL ảnh
    })
  );

  next();
});

//POST
exports.createTour = async (req, res, next) => {
  try {
    if (req.user.role !== "partner") {
      return res.status(403).json({
        status: "fail",
        message: "Only partners can create tours",
      });
    }

    const tourData = {
      ...req.body,
      partner: req.user._id,
    };

    const newTour = await Tour.create(tourData);
    res.status(201).json({
      status: "success",
      data: {
        tour: newTour,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.getPartnerTours = async (req, res, next) => {
  try {
    const partnerId = req.user.id;
    console.log(partnerId);

    let query = Tour.find({ partner: partnerId });

    query = query.sort("-createdAt");

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    const tours = await query;

    console.log(tours);

    res.status(200).json({
      status: "success",
      results: tours.length,
      data: { tours },
    });
  } catch (error) {
    next(error);
  }
};
//GET
exports.getTourById = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);
    if (!tour) {
      return res
        .status(404)
        .json({ status: "fail", message: "No tour found with that ID" });
    }
    res.status(200).json({ status: "success", data: { tour } });
  } catch (error) {
    next(error);
  }
};

//Patch
exports.updateTour = async (req, res, next) => {
  try {
    const tourId = req.params.id;
    const tour = await Tour.findById(tourId);

    if (!tour) {
      return res.status(404).json({
        status: "fail",
        message: "No tour found with that ID",
      });
    }
    //Check role moi duoc update
    if (req.user.role === "partner") {
      if (tour.partner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: "fail",
          message: "You can only update your own tours",
        });
      }
    } else if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "fail",
        message: "You are not allowed to update this tour",
      });
    }

    Object.keys(req.body).forEach((key) => {
      tour[key] = req.body[key];
    });

    const updatedTour = await tour.save();

    res.status(200).json({
      status: "success",
      data: {
        tour: updatedTour,
      },
    });
  } catch (error) {
    next(error);
  }
};

//Delete
exports.deleteTour = async (req, res, next) => {
  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res
        .status(404)
        .json({ status: "fail", message: "Không tìm thấy tour này!" });
    }

    if (
      req.user.role === "partner" &&
      tour.partner.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ status: "fail", message: "Bạn chỉ có thể xóa tour của mình!" });
    }

    await Tour.findByIdAndDelete(req.params.id);

    res.status(200).json({ status: "success", message: "Tour đã bị xóa!" });
  } catch (error) {
    next(error);
  }
};

// Update tour status by partner if it is active
exports.updateTourStatusByPartner = catchAsync(async (req, res, next) => {
  const tourId = req.params.tourId;
  const tour = await Tour.findById(tourId);
  if (!tour) {
    return next(new AppError("Không tìm thấy tour với ID này", 404));
  }

  // Check if user is partner and owns the tour
  if (tour.partner.toString() !== req.user._id.toString()) {
    return next(new AppError("Bạn không có quyền cập nhật tour này", 403));
  }

  // Check tour status
  if (tour.status === "active") {
    tour.status = "inactive";
    await tour.save();
    res.status(200).json({
      status: "success",
      message: "Tour đã được cập nhật thành không hoạt động",
    });
  } else {
    return next(new AppError("Tour đã ở trạng thái không hoạt động", 400));
  }
});

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
  } catch (err) {
    res.status(500).json({
      status: "fail",
      message: err.message,
    });
  }
};

// Get tour by slug
exports.getTourBySlug = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const tour = await Tour.findOne({ slug, status: "active" });

  if (!tour) {
    return next(new AppError("Không tìm thấy tour", 404));
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
    message: "Lấy thông tin tour thành công",
    data: {
      tour: tourResponse,
    },
  });
});
