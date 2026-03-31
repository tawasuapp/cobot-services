const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roleCheck');
const ctrl = require('../controllers/userController');

router.get('/', authenticate, ctrl.listUsers);
router.get('/operators', authenticate, ctrl.listOperators);
router.get('/drivers', authenticate, ctrl.listDrivers);
router.get('/:id', authenticate, ctrl.getUser);
router.post('/', authenticate, requireAdmin, ctrl.createUser);
router.put('/:id', authenticate, ctrl.updateUser);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteUser);

module.exports = router;
