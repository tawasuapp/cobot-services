const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/qrController');

router.post('/scan', authenticate, ctrl.processScan);
router.get('/validate/:code', authenticate, ctrl.validateQR);
router.get('/job/:jobId/status', authenticate, ctrl.getJobScanStatus);

module.exports = router;
