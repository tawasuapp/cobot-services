const { Job, Customer, User, Vehicle, Robot, Contract, JobTemplate } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse, generateJobNumber } = require('../utils/helpers');
const { sendPushNotification, createAlert, logActivity } = require('../services/notificationService');
const { getIO } = require('../config/socket');

const jobIncludes = [
  { model: Customer, attributes: ['id', 'company_name', 'address', 'latitude', 'longitude'] },
  { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate_number', 'name'] },
  { model: Robot, as: 'robot', attributes: ['id', 'serial_number', 'name'] },
];

async function listJobs(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.priority) where.priority = req.query.priority;
    if (req.query.customer_id) where.customer_id = req.query.customer_id;
    if (req.query.operator_id) where.assigned_operator_id = req.query.operator_id;

    if (req.query.date_from && req.query.date_to) {
      where.scheduled_date = { [Op.between]: [req.query.date_from, req.query.date_to] };
    } else if (req.query.date_from) {
      where.scheduled_date = { [Op.gte]: req.query.date_from };
    } else if (req.query.date_to) {
      where.scheduled_date = { [Op.lte]: req.query.date_to };
    }

    const { rows, count } = await Job.findAndCountAll({
      where,
      include: jobIncludes,
      order: [['scheduled_date', 'DESC'], ['scheduled_time', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getTodaysJobs(req, res, next) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const jobs = await Job.findAll({
      where: { scheduled_date: today },
      include: jobIncludes,
      order: [['scheduled_time', 'ASC']],
    });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
}

async function getJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id, { include: jobIncludes });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    res.json(job);
  } catch (error) {
    next(error);
  }
}

async function createJob(req, res, next) {
  try {
    const data = { ...req.body, job_number: generateJobNumber() };

    // Copy customer location to job
    if (data.customer_id) {
      const customer = await Customer.findByPk(data.customer_id);
      if (customer) {
        data.customer_latitude = customer.latitude;
        data.customer_longitude = customer.longitude;
      }
    }

    const job = await Job.create(data);
    const fullJob = await Job.findByPk(job.id, { include: jobIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'job_created',
      description: `Created job ${job.job_number}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.status(201).json(fullJob);
  } catch (error) {
    next(error);
  }
}

async function updateJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.job_number;

    await job.update(updates);
    const fullJob = await Job.findByPk(job.id, { include: jobIncludes });
    res.json(fullJob);
  } catch (error) {
    next(error);
  }
}

async function deleteJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await job.destroy();
    res.json({ message: 'Job deleted' });
  } catch (error) {
    next(error);
  }
}

async function updateJobStatus(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [
        { model: Customer, attributes: ['id', 'company_name'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'fcm_token'] },
      ],
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const oldStatus = job.status;
    const { status } = req.body;

    await job.update({ status });

    try {
      const io = getIO();
      io.to('dashboard').emit('job:status_changed', {
        jobId: job.id,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
      });
    } catch { /* socket not ready */ }

    // Send push notification to operator for key status changes
    const operator = job.operator;
    if (operator?.fcm_token) {
      const customerName = job.Customer?.company_name || 'customer';
      const notifications = {
        'arrived': { title: "You've Arrived!", body: `Continue on mobile app for ${customerName}` },
        'in_progress': { title: 'Job In Progress', body: `Robot deployed at ${customerName}` },
        'completed': { title: 'Job Completed', body: `Great work! ${customerName} job is done` },
      };
      const notif = notifications[status];
      if (notif) {
        await sendPushNotification(operator.fcm_token, notif.title, notif.body, {
          type: 'job_status_changed',
          jobId: job.id,
          status,
        });
      }
    }

    await logActivity({
      userId: req.user.id,
      action: 'job_status_changed',
      description: `Job ${job.job_number} status: ${oldStatus} → ${status}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
}

async function assignJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const updates = {};
    if (req.body.operator_id) updates.assigned_operator_id = req.body.operator_id;
    if (req.body.vehicle_id) updates.assigned_vehicle_id = req.body.vehicle_id;
    if (req.body.robot_id) updates.assigned_robot_id = req.body.robot_id;

    if (Object.keys(updates).length > 0) {
      updates.status = 'assigned';
    }

    await job.update(updates);
    const fullJob = await Job.findByPk(job.id, { include: jobIncludes });

    // Notify operator of assignment
    if (updates.assigned_operator_id) {
      const operator = await User.findByPk(updates.assigned_operator_id);
      if (operator?.fcm_token) {
        const customer = await Customer.findByPk(job.customer_id);
        await sendPushNotification(operator.fcm_token, 'New Job Assigned', `You have been assigned to ${customer?.company_name || 'a new job'}`, {
          type: 'job_assigned',
          jobId: job.id,
        });
      }
    }

    await logActivity({
      userId: req.user.id,
      action: 'job_assigned',
      description: `Assigned resources to job ${job.job_number}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.json(fullJob);
  } catch (error) {
    next(error);
  }
}

async function getOperatorJobs(req, res, next) {
  try {
    const jobs = await Job.findAll({
      where: { assigned_operator_id: req.params.id },
      include: jobIncludes,
      order: [['scheduled_date', 'DESC'], ['scheduled_time', 'ASC']],
    });
    res.json(jobs);
  } catch (error) {
    next(error);
  }
}

async function startJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await job.update({ status: 'en_route' });

    try {
      const io = getIO();
      io.to('dashboard').emit('job:status_changed', {
        jobId: job.id, oldStatus: job.status, newStatus: 'en_route', timestamp: new Date(),
      });
    } catch { /* */ }

    await logActivity({
      userId: req.user.id,
      action: 'job_started',
      description: `Started driving for job ${job.job_number}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
}

async function arriveAtJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await job.update({ status: 'arrived', arrival_time: new Date() });

    await logActivity({
      userId: req.user.id,
      action: 'arrived_at_customer',
      description: `Arrived for job ${job.job_number}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
}

async function completeJob(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.id, {
      include: [{ model: Robot, as: 'robot' }],
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const completionTime = new Date();
    const startTime = job.start_time || job.arrival_time;
    let actualDuration = null;
    if (startTime) {
      actualDuration = Math.round((completionTime - new Date(startTime)) / 60000);
    }

    await job.update({
      status: 'completed',
      completion_time: completionTime,
      actual_duration_minutes: actualDuration,
    });

    // Update robot status
    if (job.assigned_robot_id) {
      await Robot.update(
        { status: 'available', assigned_job_id: null, jobs_completed: require('sequelize').literal('jobs_completed + 1') },
        { where: { id: job.assigned_robot_id } }
      );
    }

    try {
      const io = getIO();
      io.to('dashboard').emit('job:status_changed', {
        jobId: job.id, oldStatus: 'in_progress', newStatus: 'completed', timestamp: completionTime,
      });
    } catch { /* */ }

    await logActivity({
      userId: req.user.id,
      action: 'job_completed',
      description: `Completed job ${job.job_number}`,
      entityType: 'job',
      entityId: job.id,
    });

    res.json(job);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listJobs, getTodaysJobs, getJob, createJob, updateJob, deleteJob,
  updateJobStatus, assignJob, getOperatorJobs, startJob, arriveAtJob, completeJob,
};
