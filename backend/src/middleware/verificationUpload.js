const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../uploads/verification_docs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitizedOriginal}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF, JPG, PNG, and WEBP documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB per document
});

const uploadVerificationFiles = upload.fields([
  { name: 'gov_photo_id', maxCount: 1 },
  { name: 'medical_degree', maxCount: 1 },
  { name: 'council_registration_cert', maxCount: 1 },
  { name: 'hospital_license', maxCount: 1 },
  { name: 'authorization_letter', maxCount: 1 },
  { name: 'qualification_proof', maxCount: 1 },
  { name: 'documents', maxCount: 5 }
]);

module.exports = {
  uploadVerificationFiles,
  uploadDir
};
