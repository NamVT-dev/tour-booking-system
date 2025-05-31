const express = require("express");
const adminRoutes = require("./adminRoutes");
const route = express.Router();

route.use("/admin", adminRoutes);
module.exports = route;