import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";
import path from "path";
import multer from "multer";
import rateLimit from "express-rate-limit";
import globalErrorHandlers from "./controllers/Error.Controllers.js";
import userRoutes from "./routes/UserRoutes.js";
import newsletterRoutes from "./routes/NewsletterRoutes.js";
import purchaseRoutes from "./routes/RequestRoutes.js";
import AppError from "./utils/appError.js";

// Load environment variables
dotenv.config();

// Create an Express app
const app = express();

// Define constants from environment variables
const port = process.env.PORT || 3000;
const cookieSecret = process.env.COOKIE_SECRET || "default_secret";
const isDevelopment = process.env.DEV === "Yes";
const __dirname = path.resolve();

// Middleware for serving static files
app.use(express.static(`${__dirname}`));

// Security middlewares
app.use(helmet());
app.use(cors({
  origin: [
    "https://thepreview.pro",
    "https://sellpersonalitems.thepreview.pro",
    "https://sellpersonalitem.vercel.app",
    "http://localhost:5173",
  ],
  credentials: true,
}));
app.use(cookieParser(cookieSecret));

// Rate limiter middleware
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", apiLimiter);

// Parsing middleware
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"), // Uploads folder on server
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`), // Unique file name
});
const upload = multer({ storage });

// Serve temporary files
const temporaryImageDirectory = isDevelopment
  ? path.join(__dirname, `/tmp`)
  : "/tmp";
app.use("/tmp", express.static(temporaryImageDirectory));

// Routes
app.get("/", (req, res) => res.status(200).json({ message: "I'm fine" }));
app.get("/api/v1", (req, res) => res.status(200).json({ message: "I'm fine" }));

app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/purchase-requests", purchaseRoutes);
app.use("/api/v1", userRoutes);

// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling
app.use(globalErrorHandlers);

// Start the server
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...\nurl: http://localhost:${port}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...", err);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});