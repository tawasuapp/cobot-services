const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const ctrl = require('../controllers/settingsController');

// Public-ish read for any authenticated user (mobile/IVD app needs arrival_radius etc).
router.get('/', authenticate, ctrl.getAll);
router.get('/:key', authenticate, ctrl.getOne);
// Only admins may modify.
router.put('/', authenticate, requireAdmin, ctrl.updateBulk);

module.exports = router;
