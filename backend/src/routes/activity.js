const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/activityController');

router.get('/', authenticate, ctrl.getRecentActivity);
router.get('/user/:id', authenticate, ctrl.getUserActivity);

module.exports = router;
