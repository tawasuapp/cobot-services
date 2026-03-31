const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/reportController');

router.get('/', authenticate, ctrl.listReports);
router.get('/:id', authenticate, ctrl.getReport);
router.post('/', authenticate, ctrl.createReport);
router.delete('/:id', authenticate, ctrl.deleteReport);
router.get('/job/:id', authenticate, ctrl.getReportsByJob);

module.exports = router;
