const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/notificationController');

router.get('/', authenticate, ctrl.getAlerts);
router.get('/unread', authenticate, ctrl.getUnreadCount);
router.put('/:id/read', authenticate, ctrl.markAsRead);
router.put('/read-all', authenticate, ctrl.markAllAsRead);
router.post('/', authenticate, ctrl.createAlert);

module.exports = router;
