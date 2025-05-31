const Tour = require("../models/tourModel");

//POST
exports.createTour = async (req, res, next) => {
  try {
    if (req.user.role !== "partner") {
      return res.status(403).json({
        status: "fail",
        message: "Only partners can create tours",
      });
    }
    //New tour
    const newTour = await Tour.create(req.body);

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
// GET all tours
exports.getAllTours = async (req, res, next) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    // Convert query operators
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let query = Tour.find(JSON.parse(queryStr));

    // 2. Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt"); // default sort
    }

    // 3. Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }

    // 4. Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    const tours = await query;

    res.status(200).json({
      status: "success",
      results: tours.length,
      data: {
        tours,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.updateTour = async (req, res, next) => {
  try {
    const tourId = req.params.id;

    const updatedTour = await Tour.findByIdAndUpdate(tourId, req.body, {
      new: true,
      runValidators: true, // để validate
    });

    if (!updatedTour) {
      return res.status(404).json({
        status: "fail",
        message: "No tour found with that ID",
      });
    }

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
