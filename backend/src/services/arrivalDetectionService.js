const { Job, Customer, User, Setting } = require('../models');
const { Op } = require('sequelize');
const { calculateDistance } = require('../utils/helpers');
const { sendPushNotification, createAlert, logActivity } = require('./notificationService');
const { getIO } = require('../config/socket');

async function processLocationUpdate(vehicleId, lat, lng) {
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
  if (job.status === 'arrived') return;

  const now = new Date();

  // 1. Calculate early/late arrival vs scheduled time
  const scheduledDateTime = new Date(`${job.scheduled_date}T${job.scheduled_time}`);
  const diffMinutes = Math.round((now - scheduledDateTime) / 60000);
  const lateThreshold = parseInt(await Setting.getValue('late_arrival_threshold_minutes') || '15', 10);

  let arrivalStatus = 'on_time';
  if (diffMinutes > lateThreshold) {
    arrivalStatus = 'late';
  } else if (diffMinutes < -lateThreshold) {
    arrivalStatus = 'early';
  }

  // 2. Update job status
  await job.update({
    status: 'arrived',
    arrival_time: now,
  });

  const operatorName = job.operator
    ? `${job.operator.first_name} ${job.operator.last_name}`
    : 'Operator';

  // 3. Send push notification to operator's phone
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

  // 4. Create arrival alert
  await createAlert({
    type: 'arrival_notification',
    title: 'Operator Arrived',
    message: `${operatorName} arrived at ${job.Customer.company_name}`,
    relatedEntityType: 'job',
    relatedEntityId: job.id,
  });

  // 5. Flag exception if early or late
  if (arrivalStatus === 'late') {
    await createAlert({
      type: 'late_arrival',
      severity: 'warning',
      title: 'Late Arrival',
      message: `${operatorName} arrived ${Math.abs(diffMinutes)} minutes late at ${job.Customer.company_name}`,
      relatedEntityType: 'job',
      relatedEntityId: job.id,
    });

    await logActivity({
      userId: job.assigned_operator_id,
      action: 'late_arrival',
      description: `Arrived ${Math.abs(diffMinutes)} min late at ${job.Customer.company_name}`,
      entityType: 'job',
      entityId: job.id,
      metadata: { diffMinutes, scheduledTime: job.scheduled_time, arrivalTime: now.toISOString() },
    });
  } else if (arrivalStatus === 'early') {
    await createAlert({
      type: 'late_arrival',
      severity: 'info',
      title: 'Early Arrival',
      message: `${operatorName} arrived ${Math.abs(diffMinutes)} minutes early at ${job.Customer.company_name}`,
      relatedEntityType: 'job',
      relatedEntityId: job.id,
    });
  }

  // 6. Emit socket events
  try {
    const io = getIO();
    io.to('dashboard').emit('operator:arrived', {
      operatorId: job.assigned_operator_id,
      jobId: job.id,
      customerId: job.customer_id,
      arrivalStatus,
      diffMinutes,
      timestamp: now,
    });

    io.emit('job:status_changed', {
      jobId: job.id,
      oldStatus: 'en_route',
      newStatus: 'arrived',
      timestamp: now,
    });
  } catch {
    // Socket not initialized
  }

  // 7. Log activity
  await logActivity({
    userId: job.assigned_operator_id,
    action: 'arrived_at_customer',
    description: `Arrived at ${job.Customer.company_name} (${arrivalStatus})`,
    entityType: 'job',
    entityId: job.id,
    metadata: { arrivalStatus, diffMinutes },
  });
}

module.exports = { processLocationUpdate, handleArrival };
