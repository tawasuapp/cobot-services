const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/invoiceController');

router.get('/', authenticate, ctrl.listInvoices);
router.get('/pending', authenticate, ctrl.getPendingInvoices);
router.get('/overdue', authenticate, ctrl.getOverdueInvoices);
router.get('/:id', authenticate, ctrl.getInvoice);
router.post('/', authenticate, ctrl.createInvoice);
router.put('/:id', authenticate, ctrl.updateInvoice);
router.delete('/:id', authenticate, ctrl.deleteInvoice);
router.put('/:id/status', authenticate, ctrl.updateInvoiceStatus);
router.get('/:id/pdf', authenticate, ctrl.generatePDF);

module.exports = router;
