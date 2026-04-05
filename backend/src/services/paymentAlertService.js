const { Invoice, Customer, Alert } = require('../models');
const { Op } = require('sequelize');
const { createAlert } = require('./notificationService');

async function checkOverdueInvoices() {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Find invoices that are past due and still pending
    const overdueInvoices = await Invoice.findAll({
      where: {
        status: 'pending',
        due_date: { [Op.lt]: today },
      },
      include: [{ model: Customer, attributes: ['id', 'company_name'] }],
    });

    for (const invoice of overdueInvoices) {
      // Mark as overdue
      await invoice.update({ status: 'overdue' });

      // Check if we already alerted for this invoice
      const existingAlert = await Alert.findOne({
        where: {
          type: 'payment_overdue',
          related_entity_type: 'invoice',
          related_entity_id: invoice.id,
        },
      });

      if (!existingAlert) {
        const customerName = invoice.Customer?.company_name || 'Unknown';
        await createAlert({
          type: 'payment_overdue',
          severity: 'warning',
          title: 'Overdue Payment',
          message: `Invoice ${invoice.invoice_number} from ${customerName} is overdue (QAR ${invoice.total_amount}). Due: ${invoice.due_date}`,
          relatedEntityType: 'invoice',
          relatedEntityId: invoice.id,
        });
      }
    }

    if (overdueInvoices.length > 0) {
      console.log(`Flagged ${overdueInvoices.length} overdue invoice(s)`);
    }
  } catch (error) {
    console.error('Failed to check overdue invoices:', error.message);
  }
}

module.exports = { checkOverdueInvoices };
