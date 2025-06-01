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

    let query = Tour.find({ partner: partnerId });

    query = query.sort("-createdAt");

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);

    const tours = await query;

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
