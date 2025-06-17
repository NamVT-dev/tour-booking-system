const User = require("../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");


const getNewUsersAndPartners = catchAsync(async (req, res, next) => {
    const {
        range = '1d', groupBy = 'day'
    } = req.query;

    const validRanges = ['1d', '7d', '1m', '3m', '6m', '1y'];
    const validGroups = ['day', 'month'];

    if (!validRanges.includes(range)) {
        return next(new AppError("Invalid range parameter", 400));
    }
    if (!validGroups.includes(groupBy)) {
        return next(new AppError("groupBy must be 'day' or 'month'", 400));
    }

    // Tính fromDate
    const now = new Date();
    const rangeMap = {
        '1d': () => new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        '7d': () => {
            const date = new Date(now);
            date.setDate(now.getDate() - 6);
            return date;
        },
        // '1m': () => new Date(now.getFullYear(), now.getMonth(), 1),
        '1m': () => {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 1);
            return d;
        },
        '3m': () => {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 3);
            return d;
        },
        '6m': () => {
            const d = new Date(now);
            d.setMonth(d.getMonth() - 6);
            return d;
        },
        '1y': () => {
            const d = new Date(now);
            d.setFullYear(d.getFullYear() - 1);
            return d;
        }
    };
    const fromDate = rangeMap[range]();
    const toDate = now;

    const truncateUnit = groupBy;

    const stats = await User.aggregate([{
            $match: {
                createdAt: {
                    $gte: fromDate,
                    $lte: toDate
                },
                role: {
                    $in: ['customer', 'partner']
                }
            }
        },
        {
            $facet: {
                customer: [{
                        $match: {
                            role: 'customer'
                        }
                    },
                    {
                        $group: {
                            _id: {
                                date: {
                                    $dateTrunc: {
                                        date: "$createdAt",
                                        unit: truncateUnit
                                    }
                                }
                            },
                            count: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            "_id.date": 1
                        }
                    }
                ],
                partner: [{
                        $match: {
                            role: 'partner'
                        }
                    },
                    {
                        $group: {
                            _id: {
                                date: {
                                    $dateTrunc: {
                                        date: "$createdAt",
                                        unit: truncateUnit
                                    }
                                }
                            },
                            count: {
                                $sum: 1
                            }
                        }
                    },
                    {
                        $sort: {
                            "_id.date": 1
                        }
                    }
                ],
                totals: [{
                    $group: {
                        _id: "$role",
                        totalCount: {
                            $sum: 1
                        }
                    }
                }]
            }
        }
    ]);

    res.status(200).json({
        status: 'success',
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
            }, {})
        }
    });
});

module.exports = {
    getNewUsersAndPartners,
};