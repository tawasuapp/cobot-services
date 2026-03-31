const { Job, Customer, User, Setting } = require('../models');
const { Op } = require('sequelize');
const { calculateDistance } = require('../utils/helpers');
const { sendPushNotification, createAlert, logActivity } = require('./notificationService');
const { getIO } = require('../config/socket');

async function processLocationUpdate(vehicleId, lat, lng) {
  // Find active job for this vehicle
  const job = await Job.findOne({
    where: {
      assigned_vehicle_id: vehicleId,
      status: { [Op.in]: ['assigned', 'en_route'] },
    },
    include: [
      { model: Customer },
      { model: User, as: 'operator' },
    ],
  });

  if (!job || !job.Customer) return;

  const customerLat = job.Customer.latitude;
  const customerLng = job.Customer.longitude;

  if (!customerLat || !customerLng) return;

  const distance = calculateDistance(lat, lng, customerLat, customerLng);
  const arrivalRadius = parseInt(await Setting.getValue('arrival_radius_meters') || '100', 10);

  if (distance <= arrivalRadius) {
    await handleArrival(job);
  }
}

async function handleArrival(job) {
  // Prevent duplicate arrival handling
  if (job.status === 'arrived') return;

  // 1. Update job status
  await job.update({
    status: 'arrived',
    arrival_time: new Date(),
  });

  // 2. Send push notification to operator's phone
  if (job.operator && job.operator.fcm_token) {
    await sendPushNotification(
      job.operator.fcm_token,
      "You've Arrived!",
      `Continue on mobile app for ${job.Customer.company_name}`,
      {
        type: 'arrival_notification',
        jobId: job.id,
        customerId: job.customer_id,
      }
    );
  }

  // 3. Create alert
  const operatorName = job.operator
    ? `${job.operator.first_name} ${job.operator.last_name}`
    : 'Operator';

  await createAlert({
    type: 'arrival_notification',
    title: 'Operator Arrived',
    message: `${operatorName} arrived at ${job.Customer.company_name}`,
    relatedEntityType: 'job',
    relatedEntityId: job.id,
  });

  // 4. Emit socket event
  try {
    const io = getIO();
    io.to('dashboard').emit('operator:arrived', {
      operatorId: job.assigned_operator_id,
      jobId: job.id,
      customerId: job.customer_id,
      timestamp: new Date(),
    });

    io.emit('job:status_changed', {
      jobId: job.id,
      oldStatus: 'en_route',
      newStatus: 'arrived',
      timestamp: new Date(),
    });
  } catch {
    // Socket not initialized
  }

  // 5. Log activity
  await logActivity({
    userId: job.assigned_operator_id,
    action: 'arrived_at_customer',
    description: `Arrived at ${job.Customer.company_name}`,
    entityType: 'job',
    entityId: job.id,
  });
}

module.exports = { processLocationUpdate, handleArrival };
