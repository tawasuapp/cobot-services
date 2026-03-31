const { LocationHistory, Vehicle, User } = require('../models');
const { getIO } = require('../config/socket');
const arrivalDetection = require('./arrivalDetectionService');

async function updateLocation({ entityType, entityId, lat, lng, speed, heading, accuracy }) {
  // Save to location history
  await LocationHistory.create({
    entity_type: entityType,
    entity_id: entityId,
    latitude: lat,
    longitude: lng,
    speed,
    heading,
    accuracy,
  });

  // Update current location on entity
  if (entityType === 'vehicle') {
    await Vehicle.update(
      { latitude: lat, longitude: lng, last_location_update: new Date() },
      { where: { id: entityId } }
    );

    // Check for arrival
    await arrivalDetection.processLocationUpdate(entityId, lat, lng);

    // Broadcast to dashboard
    try {
      const io = getIO();
      io.to('dashboard').emit('vehicle:location', {
        vehicleId: entityId,
        lat,
        lng,
        speed,
        heading,
        timestamp: new Date(),
      });
    } catch {
      // Socket not initialized
    }
  }

  return true;
}

async function getLocationHistory(entityType, entityId, { limit = 100, from, to } = {}) {
  const where = { entity_type: entityType, entity_id: entityId };

  if (from || to) {
    const { Op } = require('sequelize');
    where.recorded_at = {};
    if (from) where.recorded_at[Op.gte] = new Date(from);
    if (to) where.recorded_at[Op.lte] = new Date(to);
  }

  return LocationHistory.findAll({
    where,
    order: [['recorded_at', 'DESC']],
    limit,
  });
}

module.exports = { updateLocation, getLocationHistory };
