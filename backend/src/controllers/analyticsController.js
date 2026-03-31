const { Job, Invoice, Robot, Vehicle, Customer } = require('../models');
const { Op, fn, col, literal } = require('sequelize');

async function getOverview(req, res, next) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = now.toISOString().split('T')[0];

    const [monthlyRevenue, activeJobs, robotStats, vehicleStats, avgDuration, delaysToday] = await Promise.all([
      Invoice.sum('total_amount', {
        where: { status: 'paid', paid_date: { [Op.gte]: startOfMonth } },
      }),
      Job.count({ where: { status: { [Op.in]: ['assigned', 'en_route', 'arrived', 'in_progress'] } } }),
      Robot.findAll({
        attributes: [
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', literal("CASE WHEN status IN ('deployed', 'cleaning') THEN 1 ELSE 0 END")), 'in_use'],
        ],
        raw: true,
      }),
      Vehicle.findAll({
        attributes: [
          [fn('COUNT', col('id')), 'total'],
          [fn('SUM', literal("CASE WHEN status = 'active' THEN 1 ELSE 0 END")), 'active'],
        ],
        raw: true,
      }),
      Job.findAll({
        attributes: [[fn('AVG', col('actual_duration_minutes')), 'avg']],
        where: { status: 'completed', actual_duration_minutes: { [Op.ne]: null } },
        raw: true,
      }),
      Job.count({
        where: {
          scheduled_date: today,
          status: { [Op.in]: ['assigned', 'en_route'] },
          scheduled_time: { [Op.lt]: literal("NOW()::time - interval '15 minutes'") },
        },
      }),
    ]);

    const robots = robotStats[0] || { total: 0, in_use: 0 };
    const vehicles = vehicleStats[0] || { total: 0, active: 0 };
    const totalVehicles = parseInt(vehicles.total, 10) || 1;

    res.json({
      monthly_revenue: parseFloat(monthlyRevenue) || 0,
      active_jobs: activeJobs,
      robots_in_use: `${parseInt(robots.in_use, 10) || 0} of ${parseInt(robots.total, 10) || 0}`,
      fleet_utilization: Math.round(((parseInt(vehicles.active, 10) || 0) / totalVehicles) * 100),
      avg_job_duration: Math.round(parseFloat(avgDuration[0]?.avg) || 0),
      delays_today: delaysToday,
    });
  } catch (error) {
    next(error);
  }
}

async function getRevenue(req, res, next) {
  try {
    const months = parseInt(req.query.months, 10) || 6;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenue = await Invoice.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('paid_date')), 'month'],
        [fn('SUM', col('total_amount')), 'total'],
      ],
      where: {
        status: 'paid',
        paid_date: { [Op.gte]: startDate },
      },
      group: [fn('DATE_TRUNC', 'month', col('paid_date'))],
      order: [[fn('DATE_TRUNC', 'month', col('paid_date')), 'ASC']],
      raw: true,
    });

    res.json(revenue);
  } catch (error) {
    next(error);
  }
}

async function getJobStats(req, res, next) {
  try {
    const stats = await Job.findAll({
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const weekly = await Job.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'week', col('scheduled_date')), 'week'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: {
        scheduled_date: { [Op.gte]: literal("NOW() - interval '8 weeks'") },
      },
      group: [fn('DATE_TRUNC', 'week', col('scheduled_date'))],
      order: [[fn('DATE_TRUNC', 'week', col('scheduled_date')), 'ASC']],
      raw: true,
    });

    res.json({ by_status: stats, weekly });
  } catch (error) {
    next(error);
  }
}

async function getFleetUtilization(req, res, next) {
  try {
    const robotsByStatus = await Robot.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const vehiclesByStatus = await Vehicle.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    res.json({ robots: robotsByStatus, vehicles: vehiclesByStatus });
  } catch (error) {
    next(error);
  }
}

module.exports = { getOverview, getRevenue, getJobStats, getFleetUtilization };
