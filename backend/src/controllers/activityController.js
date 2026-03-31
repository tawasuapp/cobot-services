const { ActivityLog, User } = require('../models');

async function getRecentActivity(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const activity = await ActivityLog.findAll({
      include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'role'] }],
      order: [['created_at', 'DESC']],
      limit,
    });
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

async function getUserActivity(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const activity = await ActivityLog.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit,
    });
    res.json(activity);
  } catch (error) {
    next(error);
  }
}

module.exports = { getRecentActivity, getUserActivity };
