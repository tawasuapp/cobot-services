const { Vehicle } = require('../models');
const locationService = require('../services/locationService');

async function updateLocation(req, res, next) {
  try {
    const { entity_type, entity_id, lat, lng, speed, heading, accuracy } = req.body;

    if (!entity_type || !entity_id || lat == null || lng == null) {
      return res.status(400).json({ error: 'entity_type, entity_id, lat, and lng are required' });
    }

    if (!['vehicle', 'robot', 'user'].includes(entity_type)) {
      return res.status(400).json({ error: 'entity_type must be vehicle, robot, or user' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    await locationService.updateLocation({
      entityType: entity_type,
      entityId: entity_id,
      lat,
      lng,
      speed,
      heading,
      accuracy,
    });

    res.json({ message: 'Location updated' });
  } catch (error) {
    next(error);
  }
}

async function getVehicleLocations(req, res, next) {
  try {
    const vehicles = await Vehicle.findAll({
      where: {},
      attributes: ['id', 'plate_number', 'name', 'status', 'latitude', 'longitude', 'last_location_update'],
    });

    const withLocation = vehicles.filter((v) => v.latitude != null && v.longitude != null);
    res.json(withLocation);
  } catch (error) {
    next(error);
  }
}

async function getVehicleLocation(req, res, next) {
  try {
    const vehicle = await Vehicle.findByPk(req.params.id, {
      attributes: ['id', 'plate_number', 'name', 'status', 'latitude', 'longitude', 'last_location_update'],
    });

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
}

async function getLocationHistory(req, res, next) {
  try {
    const { entity_type, entity_id } = req.params;
    const { limit, from, to } = req.query;

    const history = await locationService.getLocationHistory(entity_type, entity_id, {
      limit: limit ? parseInt(limit, 10) : 100,
      from,
      to,
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  updateLocation, getVehicleLocations, getVehicleLocation, getLocationHistory,
};
