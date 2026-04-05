const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/login', ctrl.login);
router.post('/customer-login', ctrl.customerLogin);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh', authenticate, ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.put('/fcm-token', authenticate, ctrl.updateFcmToken);

// IVD QR Code Login
router.post('/ivd-session', ctrl.createIvdSession);
router.post('/ivd-approve', authenticate, ctrl.approveIvdSession);
router.get('/ivd-session/:sessionId', ctrl.checkIvdSession);

module.exports = router;
