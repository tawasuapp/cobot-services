const { Invoice, Customer, Contract, Job } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse, generateInvoiceNumber } = require('../utils/helpers');
const { logActivity } = require('../services/notificationService');

const invoiceIncludes = [
  { model: Customer, attributes: ['id', 'company_name', 'contact_person', 'email', 'phone', 'address', 'customer_code'] },
  {
    model: Job,
    attributes: ['id', 'job_number', 'service_type', 'description', 'scheduled_date',
      'start_time', 'completion_time', 'actual_duration_minutes'],
    required: false,
  },
];

async function listInvoices(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.customer_id) where.customer_id = req.query.customer_id;

    if (req.query.date_from && req.query.date_to) {
      where.issue_date = { [Op.between]: [req.query.date_from, req.query.date_to] };
    } else if (req.query.date_from) {
      where.issue_date = { [Op.gte]: req.query.date_from };
    } else if (req.query.date_to) {
      where.issue_date = { [Op.lte]: req.query.date_to };
    }

    const { rows, count } = await Invoice.findAndCountAll({
      where,
      include: invoiceIncludes,
      order: [['issue_date', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findByPk(req.params.id, { include: invoiceIncludes });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    next(error);
  }
}

async function createInvoice(req, res, next) {
  try {
    const data = { ...req.body, invoice_number: generateInvoiceNumber() };
    const invoice = await Invoice.create(data);
    const fullInvoice = await Invoice.findByPk(invoice.id, { include: invoiceIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'invoice_created',
      description: `Created invoice ${invoice.invoice_number}`,
      entityType: 'invoice',
      entityId: invoice.id,
    });

    res.status(201).json(fullInvoice);
  } catch (error) {
    next(error);
  }
}

async function updateInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.invoice_number;

    await invoice.update(updates);
    const fullInvoice = await Invoice.findByPk(invoice.id, { include: invoiceIncludes });
    res.json(fullInvoice);
  } catch (error) {
    next(error);
  }
}

async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    await invoice.destroy();
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    next(error);
  }
}

async function updateInvoiceStatus(req, res, next) {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const oldStatus = invoice.status;
    const { status, payment_method } = req.body;

    const updates = { status };
    if (status === 'paid') {
      updates.paid_date = new Date().toISOString().split('T')[0];
      if (payment_method) updates.payment_method = payment_method;
    }

    await invoice.update(updates);

    await logActivity({
      userId: req.user.id,
      action: 'invoice_status_changed',
      description: `Invoice ${invoice.invoice_number} status: ${oldStatus} → ${status}`,
      entityType: 'invoice',
      entityId: invoice.id,
    });

    const fullInvoice = await Invoice.findByPk(invoice.id, { include: invoiceIncludes });
    res.json(fullInvoice);
  } catch (error) {
    next(error);
  }
}

async function getPendingInvoices(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);

    const { rows, count } = await Invoice.findAndCountAll({
      where: { status: 'pending' },
      include: invoiceIncludes,
      order: [['due_date', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getOverdueInvoices(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const today = new Date().toISOString().split('T')[0];

    const { rows, count } = await Invoice.findAndCountAll({
      where: {
        status: { [Op.in]: ['pending', 'overdue'] },
        due_date: { [Op.lt]: today },
      },
      include: invoiceIncludes,
      order: [['due_date', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function generatePDF(req, res, next) {
  try {
    const invoice = await Invoice.findByPk(req.params.id, { include: invoiceIncludes });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    // Placeholder: return invoice data as JSON for now
    res.json({
      message: 'PDF generation placeholder',
      invoice: invoice.toJSON(),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  updateInvoiceStatus, getPendingInvoices, getOverdueInvoices, generatePDF,
};
