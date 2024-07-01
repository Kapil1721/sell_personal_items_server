import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";
import path from "path";
import globalErrorHandlers from "./controllers/Error.Controllers.js";
import userRoutes from "./routes/UserRoutes.js";
import AppError from "./utils/appError.js";
import multer from "multer";

const app = express();

env.config();

const port = process.env.PORT;
const cookie_secret = process.env.COOKIE_SECRET;
const __dirname = path.resolve();
// middlewares
app.use(express.static(`${__dirname}`));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json());
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "https://sellpersonalitems.thepreview.pro",
      "http://localhost:5173/memberships",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    exposedHeaders: ["Set-Cookie"],
  })
);
app.set("trust proxy", 1);
// app.use(session({
//   secret: process.env.sessionSecret, // your secret key to check session
//   resave: false,
//   saveUninitialized: false,
//   cookie: { maxAge: 604800000, //one week(1000*60*60*24*7)
//            sameSite: "none",
//            secure : true
//           },
//   store: store
// }));

app.use(cookieParser(cookie_secret));

// multer configuration

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Uploads folder on server
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Unique file name
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes

app.get("/api/v1", (req, res) => {
  res.status(200).json({ message: "I'am fine" });
});

app.use("/api/v1", userRoutes);

// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// global error handling
app.use(globalErrorHandlers);

// Start the server
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...\nurl: http://localhost:${port}`);
});

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});
