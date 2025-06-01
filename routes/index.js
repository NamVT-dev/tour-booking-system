const express = require('express');
const tourRoutes = require('./tourRoutes');

const route = express.Router();

route.use('/tours', tourRoutes);

module.exports = route;