const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/templateController');

router.get('/', authenticate, ctrl.listTemplates);
router.get('/:id', authenticate, ctrl.getTemplate);
router.post('/', authenticate, ctrl.createTemplate);
router.put('/:id', authenticate, ctrl.updateTemplate);
router.delete('/:id', authenticate, ctrl.deleteTemplate);
router.post('/:id/use', authenticate, ctrl.useTemplate);

module.exports = router;
