const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/contractController');

router.get('/', authenticate, ctrl.listContracts);
router.get('/expiring', authenticate, ctrl.getExpiringContracts);
router.get('/:id', authenticate, ctrl.getContract);
router.post('/', authenticate, ctrl.createContract);
router.put('/:id', authenticate, ctrl.updateContract);
router.delete('/:id', authenticate, ctrl.deleteContract);

module.exports = router;
