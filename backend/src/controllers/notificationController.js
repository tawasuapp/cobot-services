const { Alert } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');
const { getIO } = require('../config/socket');

async function getAlerts(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const userId = req.user.id;

    const where = {
      [Op.or]: [
        { target_user_id: userId },
        { target_user_id: null },
      ],
    };

    if (req.query.type) where.type = req.query.type;
    if (req.query.severity) where.severity = req.query.severity;
    if (req.query.is_read !== undefined) where.is_read = req.query.is_read === 'true';

    const { rows, count } = await Alert.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.id;

    const count = await Alert.count({
      where: {
        [Op.or]: [
          { target_user_id: userId },
          { target_user_id: null },
        ],
        is_read: false,
      },
    });

    res.json({ unread_count: count });
  } catch (error) {
    next(error);
  }
}

async function markAsRead(req, res, next) {
  try {
    const alert = await Alert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await alert.update({ is_read: true });
    res.json(alert);
  } catch (error) {
    next(error);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await Alert.update(
      { is_read: true },
      {
        where: {
          [Op.or]: [
            { target_user_id: userId },
            { target_user_id: null },
          ],
          is_read: false,
        },
      }
    );

    res.json({ message: 'All alerts marked as read' });
  } catch (error) {
    next(error);
  }
}

async function createAlert(req, res, next) {
  try {
    const alert = await Alert.create({
      type: req.body.type,
      severity: req.body.severity || 'info',
      title: req.body.title,
      message: req.body.message,
      related_entity_type: req.body.related_entity_type,
      related_entity_id: req.body.related_entity_id,
      target_user_id: req.body.target_user_id || null,
    });

    // Emit socket event
    try {
      const io = getIO();
      const eventData = {
        alertId: alert.id,
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
      };

      if (alert.target_user_id) {
        io.to(`operator:${alert.target_user_id}`).emit('alert:new', eventData);
      }
      io.to('dashboard').emit('alert:new', eventData);
    } catch { /* socket not ready */ }

    res.status(201).json(alert);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAlerts, getUnreadCount, markAsRead, markAllAsRead, createAlert,
};
