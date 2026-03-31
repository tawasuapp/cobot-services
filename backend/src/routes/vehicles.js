const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/vehicleController');

router.get('/', authenticate, ctrl.listVehicles);
router.get('/:id', authenticate, ctrl.getVehicle);
router.post('/', authenticate, ctrl.createVehicle);
router.put('/:id', authenticate, ctrl.updateVehicle);
router.delete('/:id', authenticate, ctrl.deleteVehicle);
router.put('/:id/status', authenticate, ctrl.updateVehicleStatus);
router.put('/:id/driver', authenticate, ctrl.assignDriver);
router.get('/:id/robots', authenticate, ctrl.getVehicleRobots);
router.post('/:id/qr', authenticate, ctrl.generateVehicleQR);

module.exports = router;
