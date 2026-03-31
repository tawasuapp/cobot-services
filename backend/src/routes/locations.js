const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/locationController');

router.post('/update', authenticate, ctrl.updateLocation);
router.get('/vehicles', authenticate, ctrl.getVehicleLocations);
router.get('/vehicle/:id', authenticate, ctrl.getVehicleLocation);
router.get('/history/:type/:id', authenticate, ctrl.getLocationHistory);

module.exports = router;
