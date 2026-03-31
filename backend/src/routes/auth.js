const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/customer-login', ctrl.customerLogin);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh', authenticate, ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.put('/fcm-token', authenticate, ctrl.updateFcmToken);

module.exports = router;
