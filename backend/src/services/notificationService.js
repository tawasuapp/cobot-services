const { getMessaging } = require('../config/firebase');
const { Alert } = require('../models');
const { getIO } = require('../config/socket');

async function sendPushNotification(fcmToken, title, body, data = {}) {
  const messaging = getMessaging();
  if (!messaging || !fcmToken) return null;

  try {
    const result = await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { channelId: 'default', sound: 'default' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    });
    return result;
  } catch (error) {
    console.error('Push notification failed:', error.message);
    return null;
  }
}

async function createAlert({ type, severity = 'info', title, message, relatedEntityType, relatedEntityId, targetUserId }) {
  const alert = await Alert.create({
    type,
    severity,
    title,
    message,
    related_entity_type: relatedEntityType,
    related_entity_id: relatedEntityId,
    target_user_id: targetUserId,
  });

  // Emit socket event
  try {
    const io = getIO();
    const eventData = {
      alertId: alert.id,
      type,
      title,
      message,
      severity,
    };

    if (targetUserId) {
      io.to(`operator:${targetUserId}`).emit('alert:new', eventData);
    }
    io.to('dashboard').emit('alert:new', eventData);
  } catch {
    // Socket not initialized yet
  }

  return alert;
}

async function logActivity({ userId, action, description, entityType, entityId, metadata }) {
  const { ActivityLog } = require('../models');

  const log = await ActivityLog.create({
    user_id: userId,
    action,
    description,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });

  try {
    const io = getIO();
    io.to('dashboard').emit('activity:new', {
      action,
      description,
      userId,
      timestamp: log.created_at,
    });
  } catch {
    // Socket not initialized
  }

  return log;
}

module.exports = { sendPushNotification, createAlert, logActivity };
