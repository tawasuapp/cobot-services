const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/activityController');

router.get('/', authenticate, ctrl.getRecentActivity);
router.get('/operator-report', authenticate, ctrl.getOperatorActivityReport);
router.get('/job/:jobId/timeline', authenticate, ctrl.getJobActivityTimeline);
router.get('/user/:id', authenticate, ctrl.getUserActivity);

module.exports = router;
