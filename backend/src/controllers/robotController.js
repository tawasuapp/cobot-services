const { Robot, Vehicle, Job } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');
const { generateQRCode } = require('../utils/qrGenerator');
const { logActivity } = require('../services/notificationService');
const { getIO } = require('../config/socket');

const robotIncludes = [
  { model: Vehicle, as: 'vehicle', attributes: ['id', 'plate_number', 'name'] },
];

async function listRobots(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.health_status) where.health_status = req.query.health_status;
    if (req.query.assigned_vehicle_id) where.assigned_vehicle_id = req.query.assigned_vehicle_id;

    if (req.query.search) {
      where[Op.or] = [
        { serial_number: { [Op.iLike]: `%${req.query.search}%` } },
        { name: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await Robot.findAndCountAll({
      where,
      include: robotIncludes,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getRobot(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id, { include: robotIncludes });
    if (!robot) return res.status(404).json({ error: 'Robot not found' });
    res.json(robot);
  } catch (error) {
    next(error);
  }
}

async function createRobot(req, res, next) {
  try {
    const robot = await Robot.create(req.body);
    const fullRobot = await Robot.findByPk(robot.id, { include: robotIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'robot_created',
      description: `Created robot ${robot.serial_number}`,
      entityType: 'robot',
      entityId: robot.id,
    });

    res.status(201).json(fullRobot);
  } catch (error) {
    next(error);
  }
}

async function updateRobot(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.serial_number;

    await robot.update(updates);
    const fullRobot = await Robot.findByPk(robot.id, { include: robotIncludes });
    res.json(fullRobot);
  } catch (error) {
    next(error);
  }
}

async function deleteRobot(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    await robot.destroy();
    res.json({ message: 'Robot deleted' });
  } catch (error) {
    next(error);
  }
}

async function updateRobotStatus(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const oldStatus = robot.status;
    const { status } = req.body;

    await robot.update({ status });

    try {
      const io = getIO();
      io.to('dashboard').emit('robot:status_changed', {
        robotId: robot.id,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
      });
    } catch { /* socket not ready */ }

    await logActivity({
      userId: req.user.id,
      action: 'robot_status_changed',
      description: `Robot ${robot.serial_number} status: ${oldStatus} → ${status}`,
      entityType: 'robot',
      entityId: robot.id,
    });

    res.json(robot);
  } catch (error) {
    next(error);
  }
}

async function assignToVehicle(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const { vehicle_id } = req.body;

    if (vehicle_id) {
      const vehicle = await Vehicle.findByPk(vehicle_id);
      if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

      // Check capacity
      const currentCount = await Robot.count({ where: { assigned_vehicle_id: vehicle_id } });
      if (currentCount >= vehicle.robot_capacity) {
        return res.status(400).json({ error: 'Vehicle has reached robot capacity' });
      }
    }

    await robot.update({ assigned_vehicle_id: vehicle_id || null });
    const fullRobot = await Robot.findByPk(robot.id, { include: robotIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'robot_assigned_vehicle',
      description: `Robot ${robot.serial_number} ${vehicle_id ? 'assigned to vehicle' : 'unassigned from vehicle'}`,
      entityType: 'robot',
      entityId: robot.id,
    });

    res.json(fullRobot);
  } catch (error) {
    next(error);
  }
}

async function getAvailableRobots(req, res, next) {
  try {
    const robots = await Robot.findAll({
      where: { status: 'available' },
      include: robotIncludes,
      order: [['name', 'ASC']],
    });
    res.json(robots);
  } catch (error) {
    next(error);
  }
}

async function generateRobotQR(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const code = `RBT-${robot.id.slice(0, 8).toUpperCase()}`;
    const { qrData, qrImage } = await generateQRCode('robot_deploy', robot.id, code);

    await robot.update({ qr_code: qrData });
    res.json({ qr_code: qrData, qr_image: qrImage });
  } catch (error) {
    next(error);
  }
}

async function deployRobot(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    if (robot.status !== 'available') {
      return res.status(400).json({ error: 'Robot is not available for deployment' });
    }

    const { job_id } = req.body;
    if (!job_id) return res.status(400).json({ error: 'job_id is required' });

    const job = await Job.findByPk(job_id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    await robot.update({ status: 'deployed', assigned_job_id: job_id });

    try {
      const io = getIO();
      io.to('dashboard').emit('robot:status_changed', {
        robotId: robot.id,
        oldStatus: 'available',
        newStatus: 'deployed',
        jobId: job_id,
        timestamp: new Date(),
      });
    } catch { /* socket not ready */ }

    await logActivity({
      userId: req.user.id,
      action: 'robot_deployed',
      description: `Deployed robot ${robot.serial_number} to job ${job.job_number}`,
      entityType: 'robot',
      entityId: robot.id,
    });

    const fullRobot = await Robot.findByPk(robot.id, { include: robotIncludes });
    res.json(fullRobot);
  } catch (error) {
    next(error);
  }
}

async function returnRobot(req, res, next) {
  try {
    const robot = await Robot.findByPk(req.params.id);
    if (!robot) return res.status(404).json({ error: 'Robot not found' });

    const oldStatus = robot.status;
    await robot.update({ status: 'available', assigned_job_id: null });

    try {
      const io = getIO();
      io.to('dashboard').emit('robot:status_changed', {
        robotId: robot.id,
        oldStatus,
        newStatus: 'available',
        timestamp: new Date(),
      });
    } catch { /* socket not ready */ }

    await logActivity({
      userId: req.user.id,
      action: 'robot_returned',
      description: `Robot ${robot.serial_number} returned and set to available`,
      entityType: 'robot',
      entityId: robot.id,
    });

    const fullRobot = await Robot.findByPk(robot.id, { include: robotIncludes });
    res.json(fullRobot);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listRobots, getRobot, createRobot, updateRobot, deleteRobot,
  updateRobotStatus, assignToVehicle, getAvailableRobots, generateRobotQR,
  deployRobot, returnRobot,
};
