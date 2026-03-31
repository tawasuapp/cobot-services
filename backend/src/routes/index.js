const router = require('express').Router();

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/customers', require('./customers'));
router.use('/jobs', require('./jobs'));
router.use('/contracts', require('./contracts'));
router.use('/templates', require('./templates'));
router.use('/robots', require('./robots'));
router.use('/vehicles', require('./vehicles'));
router.use('/invoices', require('./invoices'));
router.use('/reports', require('./reports'));
router.use('/location', require('./locations'));
router.use('/alerts', require('./notifications'));
router.use('/qr', require('./qr'));
router.use('/analytics', require('./analytics'));
router.use('/activity', require('./activity'));

module.exports = router;
