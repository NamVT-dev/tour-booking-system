const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const tourRoutes = require("./tourRoutes");
const reportRoutes = require("./reportRoutes");
const bookingRoutes = require("./bookingRoutes");

const route = express.Router();

route.use("/auth", authRoutes);
route.use("/admin", adminRoutes);
route.use("/tours", tourRoutes);
route.use("/reports", reportRoutes);
route.use("/bookings", bookingRoutes);

module.exports = route;
