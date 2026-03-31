const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/jobController');

router.get('/', authenticate, ctrl.listJobs);
router.get('/today', authenticate, ctrl.getTodaysJobs);
router.get('/:id', authenticate, ctrl.getJob);
router.post('/', authenticate, ctrl.createJob);
router.put('/:id', authenticate, ctrl.updateJob);
router.delete('/:id', authenticate, ctrl.deleteJob);
router.put('/:id/status', authenticate, ctrl.updateJobStatus);
router.put('/:id/assign', authenticate, ctrl.assignJob);
router.get('/operator/:id', authenticate, ctrl.getOperatorJobs);
router.post('/:id/start', authenticate, ctrl.startJob);
router.post('/:id/arrive', authenticate, ctrl.arriveAtJob);
router.post('/:id/complete', authenticate, ctrl.completeJob);

module.exports = router;
