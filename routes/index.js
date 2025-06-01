const express = require("express");
const authRoutes = require("./authRoutes");
const adminRoutes = require("./adminRoutes");
const tourRoutes = require("./tourRoutes");

const route = express.Router();

route.use("/auth", authRoutes);

route.use("/admin", adminRoutes);

route.use("/tours", tourRoutes);

module.exports = route;
