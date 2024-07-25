import express from "express";
import cors from "cors";
import env from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";
import path from "path";
import globalErrorHandlers from "./controllers/Error.Controllers.js";
import userRoutes from "./routes/UserRoutes.js";
import newsletterRoutes from "./routes/NewsletterRoutes.js";
import purchaseRoutes from "./routes/RequestRoutes.js";
import AppError from "./utils/appError.js";
import multer from "multer";
import { sql } from "@vercel/postgres";

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
app.use(cookieParser(cookie_secret));

// const allowedOrigins = [
//   "https://sellpersonalitems.thepreview.pro",
//   // 'https://anotherdomain.com',
//   "http://localhost:5173",
// ];

app.use(
  cors({
    origin: [
      "https://thepreview.pro",
      "https://sellpersonalitems.thepreview.pro",
      "https://sellpersonalitem.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
    // exposedHeaders: ["Set-Cookie"],
  })
);
// app.use(function (request, response, next) {
//   response.header("Access-Control-Allow-Origin", "*");
//   response.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });
// app.set("trust proxy", 1);
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

let tempraryImageDirectory;
if (process.env.DEV && process.env.DEV === "Yes") {
  tempraryImageDirectory = path.join(__dirname, `/tmp`);
} else {
  tempraryImageDirectory = "/tmp";
}
app.use("/tmp", express.static(tempraryImageDirectory));

// routes

app.get("/", (req, res) => {
  res.status(200).json({ message: "I'am fine" });
});
app.get("/api/v1", (req, res) => {
  res.status(200).json({ message: "I'am fine" });
});

app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/purchase-requests", purchaseRoutes);
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
