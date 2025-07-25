const User = require("../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const Booking = require("../models/bookingModel");

const getNewUsersAndPartners = catchAsync(async (req, res, next) => {
  const { range = "1d", groupBy = "day", from, to } = req.query;

  const validRanges = ["1d", "7d", "1m", "3m", "6m", "1y"];
  const validGroups = ["day", "month"];
  if (!validGroups.includes(groupBy)) {
    return next(new AppError("groupBy phải là 'day' hoặc 'month'", 400));
  }
  if (!from || !to) {
    if (!validRanges.includes(range)) {
      return next(new AppError("range không hợp lệ", 400));
    }
  }
  // Tính fromDate
  let fromDate, toDate;
  const now = new Date();

  if (from && to) {
    fromDate = new Date(from);
    toDate = new Date(to);
    if (isNaN(fromDate) || isNaN(toDate)) {
      return next(new AppError("Ngày không hợp lệ", 400));
    }
  } else {
    const rangeMap = {
      "1d": () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      "7d": () => {
        const date = new Date(now);
        date.setDate(now.getDate() - 6);
        return date;
      },
      "1m": () => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 1);
        return d;
      },
      "3m": () => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 3);
        return d;
      },
      "6m": () => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 6);
        return d;
      },
      "1y": () => {
        const d = new Date(now);
        d.setFullYear(d.getFullYear() - 1);
        return d;
      },
    };
    fromDate = rangeMap[range]();
    toDate = now;
  }
  const truncateUnit = groupBy;

  const stats = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
        role: {
          $in: ["customer", "partner"],
        },
      },
    },
    {
      $facet: {
        customer: [
          {
            $match: {
              role: "customer",
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateTrunc: {
                    date: "$createdAt",
                    unit: truncateUnit,
                  },
                },
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              "_id.date": 1,
            },
          },
        ],
        partner: [
          {
            $match: {
              role: "partner",
            },
          },
          {
            $group: {
              _id: {
                date: {
                  $dateTrunc: {
                    date: "$createdAt",
                    unit: truncateUnit,
                  },
                },
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              "_id.date": 1,
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: "$role",
              totalCount: {
                $sum: 1,
              },
            },
          },
        ],
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    period: range,
    groupBy,
    from: fromDate,
    to: toDate,
    data: {
      customer: stats[0].customer,
      partner: stats[0].partner,
      totals: stats[0].totals.reduce((acc, cur) => {
        acc[cur._id] = cur.totalCount;
        return acc;
      }, {}),
    },
  });
});

const getRevenueStats = catchAsync(async (req, res, next) => {
  const { range = "day", groupBy = "day", from, to } = req.query;

  const now = new Date();
  let fromDate, toDate;

  if (from && to) {
    fromDate = new Date(from);
    toDate = new Date(to);
    if (isNaN(fromDate) || isNaN(toDate)) {
      return next(new AppError("Ngày không hợp lệ", 400));
    }
  } else {
    switch (range) {
      case "day":
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        const dayOfWeek = now.getDay();
        fromDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek + 1
        );
        break;
      case "month":
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        fromDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return next(new AppError("range không hợp lệ", 400));
    }
    toDate = now;
  }

  let dateFormat;
  if (groupBy === "day") {
    dateFormat = {
      year: {
        $year: "$createdAt",
      },
      month: {
        $month: "$createdAt",
      },
      day: {
        $dayOfMonth: "$createdAt",
      },
    };
  } else if (groupBy === "week") {
    dateFormat = {
      year: {
        $year: "$createdAt",
      },
      week: {
        $week: "$createdAt",
      },
    };
  } else if (groupBy === "month") {
    dateFormat = {
      year: {
        $year: "$createdAt",
      },
      month: {
        $month: "$createdAt",
      },
    };
  } else if (groupBy === "year") {
    dateFormat = {
      year: {
        $year: "$createdAt",
      },
    };
  } else {
    return next(new AppError("groupBy không hợp lệ", 400));
  }
  const stats = await Booking.aggregate([
    {
      $match: {
        createdAt: {
          $gte: fromDate,
          $lte: toDate,
        },
        paid: true,
      },
    },
    {
      $group: {
        _id: dateFormat,
        totalRevenue: {
          $sum: "$price",
        },
        totalBookings: {
          $sum: 1,
        },
        averageBookingValue: {
          $avg: "$price",
        },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
        "_id.day": 1,
        "_id.week": 1,
      },
    },
  ]);
  const totalRevenue = stats.reduce((sum, item) => sum + item.totalRevenue, 0);

  res.status(200).json({
    status: "success",
    data: {
      period: range,
      groupBy: groupBy,
      from: fromDate,
      to: toDate,
      stats: stats,
      totalAllRevenue: totalRevenue,
    },
  });
});

module.exports = {
  getNewUsersAndPartners,
  getRevenueStats,
};
