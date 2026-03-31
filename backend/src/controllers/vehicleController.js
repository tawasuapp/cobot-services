const { Vehicle, User, Robot } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');
const { generateQRCode } = require('../utils/qrGenerator');
const { logActivity } = require('../services/notificationService');
const { getIO } = require('../config/socket');

const vehicleIncludes = [
  { model: User, as: 'driver', attributes: ['id', 'first_name', 'last_name', 'email', 'phone'] },
  { model: Robot, as: 'robots', attributes: ['id', 'serial_number', 'name', 'status'] },
];

async function listVehicles(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.assigned_driver_id) where.assigned_driver_id = req.query.assigned_driver_id;

    if (req.query.search) {
      where[Op.or] = [
        { plate_number: { [Op.iLike]: `%${req.query.search}%` } },
        { name: { [Op.iLike]: `%${req.query.search}%` } },
      ];
    }

    const { rows, count } = await Vehicle.findAndCountAll({
      where,
      include: vehicleIncludes,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, { include: vehicleIncludes });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
}

async function createVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.create(req.body);
    const fullVehicle = await Vehicle.findByPk(vehicle.id, { include: vehicleIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'vehicle_created',
      description: `Created vehicle ${vehicle.plate_number}`,
      entityType: 'vehicle',
      entityId: vehicle.id,
    });

    res.status(201).json(fullVehicle);
  } catch (error) {
    next(error);
  }
}

async function updateVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.plate_number;

    await vehicle.update(updates);
    const fullVehicle = await Vehicle.findByPk(vehicle.id, { include: vehicleIncludes });
    res.json(fullVehicle);
  } catch (error) {
    next(error);
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    await vehicle.destroy();
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    next(error);
  }
}

async function updateVehicleStatus(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const oldStatus = vehicle.status;
    const { status } = req.body;

    await vehicle.update({ status });

    try {
      const io = getIO();
      io.to('dashboard').emit('vehicle:status_changed', {
        vehicleId: vehicle.id,
        oldStatus,
        newStatus: status,
        timestamp: new Date(),
      });
    } catch { /* socket not ready */ }

    await logActivity({
      userId: req.user.id,
      action: 'vehicle_status_changed',
      description: `Vehicle ${vehicle.plate_number} status: ${oldStatus} → ${status}`,
      entityType: 'vehicle',
      entityId: vehicle.id,
    });

    res.json(vehicle);
  } catch (error) {
    next(error);
  }
}

async function assignDriver(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const { driver_id } = req.body;

    if (driver_id) {
      const driver = await User.findByPk(driver_id);
      if (!driver) return res.status(404).json({ error: 'Driver not found' });
    }

    await vehicle.update({ assigned_driver_id: driver_id || null });
    const fullVehicle = await Vehicle.findByPk(vehicle.id, { include: vehicleIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'vehicle_driver_assigned',
      description: `Vehicle ${vehicle.plate_number} ${driver_id ? 'assigned to driver' : 'driver unassigned'}`,
      entityType: 'vehicle',
      entityId: vehicle.id,
    });

    res.json(fullVehicle);
  } catch (error) {
    next(error);
  }
}

async function getVehicleRobots(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const robots = await Robot.findAll({
      where: { assigned_vehicle_id: req.params.id },
      order: [['name', 'ASC']],
    });

    res.json(robots);
  } catch (error) {
    next(error);
  }
}

async function generateVehicleQR(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id);
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const code = `VHC-${vehicle.id.slice(0, 8).toUpperCase()}`;
    const { qrData, qrImage } = await generateQRCode('vehicle_return', vehicle.id, code);

    await vehicle.update({ qr_code: qrData });
    res.json({ qr_code: qrData, qr_image: qrImage });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listVehicles, getVehicle, createVehicle, updateVehicle, deleteVehicle,
  updateVehicleStatus, assignDriver, getVehicleRobots, generateVehicleQR,
};
