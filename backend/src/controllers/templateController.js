const { JobTemplate, Job, Customer } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse, generateJobNumber } = require('../utils/helpers');
const { logActivity } = require('../services/notificationService');

async function listTemplates(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.category) where.category = req.query.category;
    if (req.query.service_type) where.service_type = req.query.service_type;
    if (req.query.is_active !== undefined) where.is_active = req.query.is_active === 'true';

    const { rows, count } = await JobTemplate.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getTemplate(req, res, next) {
  try {
    const template = await JobTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    next(error);
  }
}

async function createTemplate(req, res, next) {
  try {
    const template = await JobTemplate.create(req.body);

    await logActivity({
      userId: req.user.id,
      action: 'template_created',
      description: `Created template "${template.name}"`,
      entityType: 'job_template',
      entityId: template.id,
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const template = await JobTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.usage_count;

    await template.update(updates);
    res.json(template);
  } catch (error) {
    next(error);
  }
}

async function deleteTemplate(req, res, next) {
  try {
    const template = await JobTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    await template.destroy();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
}

async function useTemplate(req, res, next) {
  try {
    const template = await JobTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    if (!template.is_active) return res.status(400).json({ error: 'Template is not active' });

    const { customer_id, scheduled_date, scheduled_time, ...overrides } = req.body;

    if (!customer_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: 'customer_id, scheduled_date, and scheduled_time are required' });
    }

    // Copy customer location to job
    const jobData = {
      job_number: generateJobNumber(),
      customer_id,
      template_id: template.id,
      service_type: template.service_type,
      description: template.description,
      estimated_duration_minutes: template.estimated_duration_minutes,
      hourly_rate: template.base_price,
      currency: template.currency,
      scheduled_date,
      scheduled_time,
      ...overrides,
    };

    const customer = await Customer.findByPk(customer_id);
    if (customer) {
      jobData.customer_latitude = customer.latitude;
      jobData.customer_longitude = customer.longitude;
    }

    const job = await Job.create(jobData);

    // Increment usage count
    await template.increment('usage_count');

    await logActivity({
      userId: req.user.id,
      action: 'template_used',
      description: `Created job ${job.job_number} from template "${template.name}"`,
      entityType: 'job',
      entityId: job.id,
    });

    res.status(201).json(job);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate,
  useTemplate,
};
