const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const tourRoutes = require("./tourRoutes");
const reportRoutes = require("./reportRoutes");

const route = express.Router();

route.use("/auth", authRoutes);
route.use("/admin", adminRoutes);
route.use("/tours", tourRoutes);
route.use("/reports", reportRoutes);

module.exports = route;
