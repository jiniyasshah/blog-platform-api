import multer from "multer";
import path from "path";

// Set up storage configuration for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },

  // Define how the uploaded file's name should be set
  filename: function (req, file, cb) {
    // Sanitize the filename to ensure it's safe (avoiding directory traversal)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const safeFilename = path.basename(file.originalname);
    cb(null, uniqueSuffix + "-" + safeFilename);
  },
});

export const upload = multer({
  storage,

  // Filter incoming files based on their mime type (e.g., only allow images)
  fileFilter: function (req, file, cb) {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type, only JPEG and PNG are allowed!"), false);
    }
  },
});
