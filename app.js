import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import bodyParser from "body-parser";
import path from "path";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import globalErrorHandlers from "./controllers/Error.Controllers.js";
import userRoutes from "./routes/UserRoutes.js";
import newsletterRoutes from "./routes/NewsletterRoutes.js";
import purchaseRoutes from "./routes/RequestRoutes.js";
import AppError from "./utils/appError.js";

const app = express();
const prisma = new PrismaClient();
dotenv.config();

const port = process.env.PORT;
const cookie_secret = process.env.COOKIE_SECRET;
const __dirname = path.resolve();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// WebSocket setup
export const broadcast = (data) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // 1: OPEN
      client.send(JSON.stringify(data));
    }
  });
};

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

// Middleware setup
app.use(express.static(`${__dirname}`));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json());
app.use(helmet());
app.use(cookieParser(cookie_secret));
app.use(cors({
  origin: [
    "https://thepreview.pro",
    "https://sellpersonalitems.thepreview.pro",
    "https://sellpersonalitem.vercel.app",
    "http://localhost:5173",
  ],
  credentials: true,
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Uploads folder on server
  },
  filename: (req, file, cb) => {
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

// Routes
app.get("/", (req, res) => {
  res.status(200).json({ message: "I'am fine" });
});

app.get("/api/v1", (req, res) => {
  res.status(200).json({ message: "I'am fine" });
});

app.use("/api/v1/newsletter", newsletterRoutes);
app.use("/api/v1/purchase-requests", purchaseRoutes);
app.use("/api/v1", userRoutes);

// // Update Item route
// app.put("/update-item/:id", async (req, res) => {
//   const { id } = req.params;
//   const { name, price } = req.body;

//   const updatedItem = await prisma.item.update({
//     where: { id: parseInt(id) },
//     data: { name, price },
//   });

//   broadcast(updatedItem);
//   res.json(updatedItem);
// });

// Handle undefined routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling
app.use(globalErrorHandlers);

// Start the server
server.listen(port, () => {
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
