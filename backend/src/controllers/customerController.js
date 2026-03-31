const bcrypt = require('bcryptjs');
const { Customer, Job, Invoice } = require('../models');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');
const { generateQRCode } = require('../utils/qrGenerator');

async function listCustomers(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { company_name: { [Op.iLike]: `%${req.query.search}%` } },
        { contact_person: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await Customer.findAndCountAll({
      where,
      attributes: { exclude: ['portal_password_hash'] },
      order: [['company_name', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      attributes: { exclude: ['portal_password_hash'] },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const { portal_password, ...data } = req.body;

    if (portal_password) {
      const salt = await bcrypt.genSalt(10);
      data.portal_password_hash = await bcrypt.hash(portal_password, salt);
    }

    const customer = await Customer.create(data);
    const { portal_password_hash: _, ...customerData } = customer.toJSON();
    res.status(201).json(customerData);
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const { portal_password, ...data } = req.body;
    delete data.id;

    if (portal_password) {
      const salt = await bcrypt.genSalt(10);
      data.portal_password_hash = await bcrypt.hash(portal_password, salt);
    }

    await customer.update(data);
    const { portal_password_hash: _, ...customerData } = customer.toJSON();
    res.json(customerData);
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    await customer.destroy();
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    next(error);
  }
}

async function getCustomerJobs(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const { rows, count } = await Job.findAndCountAll({
      where: { customer_id: req.params.id },
      order: [['scheduled_date', 'DESC']],
      limit,
      offset,
    });
    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getCustomerInvoices(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const { rows, count } = await Invoice.findAndCountAll({
      where: { customer_id: req.params.id },
      order: [['issue_date', 'DESC']],
      limit,
      offset,
    });
    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getCustomerReports(req, res, next) {
  try {
    const { JobReport } = require('../models');
    const reports = await JobReport.findAll({
      include: [{
        model: Job,
        where: { customer_id: req.params.id },
        attributes: ['id', 'job_number', 'service_type', 'scheduled_date'],
      }],
      order: [['uploaded_at', 'DESC']],
    });
    res.json(reports);
  } catch (error) {
    next(error);
  }
}

async function generateCustomerQR(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const code = `CUST-${customer.id.slice(0, 8).toUpperCase()}`;
    const { qrData, qrImage } = await generateQRCode('customer_location', customer.id, code);

    await customer.update({ qr_code: qrData });
    res.json({ qr_code: qrData, qr_image: qrImage });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  getCustomerJobs, getCustomerInvoices, getCustomerReports, generateCustomerQR,
};
