const mongoose = require("mongoose");
const dotenv = require("dotenv");
const AuthRoute = require("./routes/authRoute");
const TourAuth = require("./routes/tourRoute");
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
});

dotenv.config({ path: "./.env" });

const app = require("./app");

const DB = process.env.DATABASE;
mongoose.connect(DB).then(() => console.log("DB connection successful!"));
app.use("/api/auth", AuthRoute);
app.use("/api/tour", TourAuth);
const port = process.env.PORT || 9999;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
