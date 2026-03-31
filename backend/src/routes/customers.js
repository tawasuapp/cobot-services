const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.get('/', authenticate, ctrl.listCustomers);
router.get('/:id', authenticate, ctrl.getCustomer);
router.post('/', authenticate, ctrl.createCustomer);
router.put('/:id', authenticate, ctrl.updateCustomer);
router.delete('/:id', authenticate, ctrl.deleteCustomer);
router.get('/:id/jobs', authenticate, ctrl.getCustomerJobs);
router.get('/:id/invoices', authenticate, ctrl.getCustomerInvoices);
router.get('/:id/reports', authenticate, ctrl.getCustomerReports);
router.post('/:id/qr', authenticate, ctrl.generateCustomerQR);

module.exports = router;
