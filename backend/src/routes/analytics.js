const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/analyticsController');

router.get('/overview', authenticate, ctrl.getOverview);
router.get('/revenue', authenticate, ctrl.getRevenue);
router.get('/jobs', authenticate, ctrl.getJobStats);
router.get('/fleet', authenticate, ctrl.getFleetUtilization);

module.exports = router;
