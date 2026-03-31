const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/robotController');

router.get('/', authenticate, ctrl.listRobots);
router.get('/available', authenticate, ctrl.getAvailableRobots);
router.get('/:id', authenticate, ctrl.getRobot);
router.post('/', authenticate, ctrl.createRobot);
router.put('/:id', authenticate, ctrl.updateRobot);
router.delete('/:id', authenticate, ctrl.deleteRobot);
router.put('/:id/status', authenticate, ctrl.updateRobotStatus);
router.put('/:id/assign', authenticate, ctrl.assignToVehicle);
router.post('/:id/qr', authenticate, ctrl.generateRobotQR);
router.post('/:id/deploy', authenticate, ctrl.deployRobot);
router.post('/:id/return', authenticate, ctrl.returnRobot);

module.exports = router;
