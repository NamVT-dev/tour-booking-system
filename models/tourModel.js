const mongoose = require("mongoose");
const slugify = require("slugify");

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Một tour du lịch phải có tên"],
      unique: true,
      trim: true,
      maxlength: [40, "Tên tour phải có ít hơn hoặc bằng 40 ký tự"],
      minlength: [10, "Tên tour phải có nhiều hơn hoặc bằng 10 ký tự"],
    },
    slug: String,
    duration: {
      type: String,
      required: [true, "Một chuyến tham quan phải có thời gian"],
    },
    maxGroupSize: {
      type: Number,
      required: [true, "Một tour du lịch phải có quy mô nhóm"],
      min: [2, "Kích thước nhóm phải lớn hơn 1"],
      max: [100, "Kích thước nhóm không được lớn hơn 100"],
    },
    partner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Một tour du lịch phải có đối tác"],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, "Đánh giá phải trên 1.0"],
      max: [5, "Đánh giá phải dưới 5.0"],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, "Một chuyến đi phải có giá"],
    },
    priceDiscount: {
      type: Number,
      min: [0, "Giảm giá không thể âm"],
      max: [100, "Giảm giá không vượt quá 100%"],
    },
    finalPrice: {
      type: Number,
    },
    summary: {
      type: String,
      trim: true,
      required: [true, "Một tour cần phải có một bản tóm tắt."],
    },
    description: {
      type: String,
      trim: true,
      required: [true, "Một tour du lịch phải có mô tả"],
    },
    imageCover: {
      type: String,
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    startLocation: {
      type: {
        type: String,
        default: "Point",
        enum: ["Point"],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: "Point",
          enum: ["Point"],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    status: {
      type: String,
      enum: ["active", "pending", "inactive"],
      default: "pending",
    },
  },
  {
    versionKey: false,
  }
);

tourSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  if (this.price && this.priceDiscount >= 0) {
    this.finalPrice = this.price - (this.price * this.priceDiscount) / 100;
  }
  next();
});

const Tour = mongoose.model("Tour", tourSchema);
module.exports = Tour;
