const express = require("express");
const tourController = require("../controllers/tourController");

const router = express.Router();

router.get("/", tourController.getAllTours);

module.exports = router;
