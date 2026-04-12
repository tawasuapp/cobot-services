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

async function generateCustomerCode() {
  // CUST-0001 style sequential code, derived from current customer count.
  const count = await Customer.count();
  let n = count + 1;
  // ensure uniqueness in case of gaps / concurrent inserts
  // (loop a few times before giving up)
  for (let i = 0; i < 50; i++) {
    const code = `CUST-${String(n).padStart(4, '0')}`;
    const exists = await Customer.findOne({ where: { customer_code: code } });
    if (!exists) return code;
    n++;
  }
  return `CUST-${Date.now().toString().slice(-6)}`;
}

async function createCustomer(req, res, next) {
  try {
    const { portal_password, ...data } = req.body;

    if (portal_password) {
      const salt = await bcrypt.genSalt(10);
      data.portal_password_hash = await bcrypt.hash(portal_password, salt);
    }

    if (!data.customer_code || !String(data.customer_code).trim()) {
      data.customer_code = await generateCustomerCode();
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
      include: [{
        model: Job,
        attributes: ['id', 'job_number', 'service_type', 'description', 'scheduled_date',
          'start_time', 'completion_time', 'actual_duration_minutes'],
        required: false,
      }],
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
    const { JobReport, User } = require('../models');
    const where = { customer_id: req.params.id };
    if (req.query.date_from || req.query.date_to) {
      const { Op } = require('sequelize');
      where.scheduled_date = {};
      if (req.query.date_from) where.scheduled_date[Op.gte] = req.query.date_from;
      if (req.query.date_to) where.scheduled_date[Op.lte] = req.query.date_to;
    }
    const jobs = await Job.findAll({
      where,
      attributes: [
        'id', 'job_number', 'service_type', 'description', 'status',
        'scheduled_date', 'scheduled_time', 'start_time', 'completion_time',
        'estimated_duration_minutes', 'actual_duration_minutes',
        'total_cost', 'currency', 'notes',
      ],
      include: [
        {
          model: JobReport,
          as: 'reports',
          required: false,
          include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
        },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['scheduled_date', 'DESC'], ['scheduled_time', 'DESC']],
    });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
}

async function generateCustomerQR(req, res, next) {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (!customer.customer_code) {
      customer.customer_code = await generateCustomerCode();
      await customer.save();
    }
    const code = customer.customer_code;
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
