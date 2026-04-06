const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/reports');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(ext && mime ? null : new Error('Only images and PDFs allowed'), ext && mime);
  },
});

router.get('/', authenticate, ctrl.listReports);
router.get('/:id', authenticate, ctrl.getReport);
router.post('/', authenticate, upload.single('file'), ctrl.createReport);
router.delete('/:id', authenticate, ctrl.deleteReport);
router.get('/job/:jobId', authenticate, ctrl.getReportsByJob);

module.exports = router;
