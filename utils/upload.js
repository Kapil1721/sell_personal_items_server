// import multer from "multer";

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "/tmp");
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "@" + file.originalname);
//   },
// });
// const upload = multer({ storage: storage });

// export default upload;



import multer from "multer";
import path from "path";

// Define storage for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads"); // Update this path to your desired directory
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "@" + file.originalname);
  },
});

// Initialize multer with the configured storage
const upload = multer({ storage: storage });

export default upload;
