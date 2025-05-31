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
