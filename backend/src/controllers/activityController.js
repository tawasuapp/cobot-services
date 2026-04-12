const { ActivityLog, User, Job, Customer, JobReport, QRScanLog, LocationHistory } = require('../models');
const { Op } = require('sequelize');

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

/**
 * Operator-activity report. Returns one row per job (any job that had an
 * operator assigned), enriched with customer, operator, and counts of
 * activity logs / QR scans / uploaded reports. Powers the admin "Reports"
 * page where each row drills into a per-job timeline.
 */
async function getOperatorActivityReport(req, res, next) {
  try {
    const where = {
      assigned_operator_id: { [Op.ne]: null },
    };
    if (req.query.operator_id) where.assigned_operator_id = req.query.operator_id;
    if (req.query.customer_id) where.customer_id = req.query.customer_id;
    if (req.query.date_from || req.query.date_to) {
      where.scheduled_date = {};
      if (req.query.date_from) where.scheduled_date[Op.gte] = req.query.date_from;
      if (req.query.date_to) where.scheduled_date[Op.lte] = req.query.date_to;
    }
    if (req.query.status) where.status = req.query.status;

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
    const jobs = await Job.findAll({
      where,
      include: [
        { model: Customer, attributes: ['id', 'company_name', 'customer_code', 'address', 'latitude', 'longitude'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name'] },
        { model: JobReport, as: 'reports', attributes: ['id'], required: false },
      ],
      order: [['scheduled_date', 'DESC'], ['scheduled_time', 'DESC']],
      limit,
    });

    // Pull lightweight scan + activity counts in batch
    const jobIds = jobs.map(j => j.id);
    const [scanCounts, activityCounts] = await Promise.all([
      QRScanLog.findAll({
        where: { job_id: { [Op.in]: jobIds } },
        attributes: ['job_id'],
      }),
      ActivityLog.findAll({
        where: { entity_type: 'job', entity_id: { [Op.in]: jobIds } },
        attributes: ['entity_id'],
      }),
    ]);
    const scanByJob = {};
    scanCounts.forEach(s => { scanByJob[s.job_id] = (scanByJob[s.job_id] || 0) + 1; });
    const activityByJob = {};
    activityCounts.forEach(a => { activityByJob[a.entity_id] = (activityByJob[a.entity_id] || 0) + 1; });

    const result = jobs.map(j => {
      const json = j.toJSON();
      return {
        ...json,
        report_count: json.reports?.length || 0,
        scan_count: scanByJob[json.id] || 0,
        activity_count: activityByJob[json.id] || 0,
        reports: undefined,
      };
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Per-job operator activity timeline. Combines, in chronological order:
 * - ActivityLog entries (entity_type='job', entity_id=jobId)
 * - QRScanLog entries (with GPS lat/lng)
 * - JobReport uploads (photos, etc.)
 * Plus a `gps_track` array of recent vehicle location pings, when available.
 */
async function getJobActivityTimeline(req, res, next) {
  try {
    const job = await Job.findByPk(req.params.jobId, {
      include: [
        { model: Customer, attributes: ['id', 'company_name', 'customer_code', 'address', 'latitude', 'longitude'] },
        { model: User, as: 'operator', attributes: ['id', 'first_name', 'last_name', 'phone'] },
      ],
    });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const [logs, scans, reports] = await Promise.all([
      ActivityLog.findAll({
        where: { entity_type: 'job', entity_id: job.id },
        include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'role'] }],
        order: [['created_at', 'ASC']],
      }),
      QRScanLog.findAll({
        where: { job_id: job.id },
        include: [{ model: User, as: 'scanner', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['scanned_at', 'ASC']],
      }),
      JobReport.findAll({
        where: { job_id: job.id },
        include: [{ model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] }],
        order: [['uploaded_at', 'ASC']],
      }),
    ]);

    // GPS track from operator's vehicle, between start_time and completion_time (or last 6h fallback)
    let gpsTrack = [];
    if (job.assigned_vehicle_id) {
      const where = { entity_type: 'vehicle', entity_id: job.assigned_vehicle_id };
      if (job.start_time || job.completion_time) {
        const range = {};
        if (job.start_time) range[Op.gte] = job.start_time;
        if (job.completion_time) range[Op.lte] = job.completion_time;
        where.recorded_at = range;
      }
      gpsTrack = await LocationHistory.findAll({
        where,
        attributes: ['latitude', 'longitude', 'recorded_at', 'speed'],
        order: [['recorded_at', 'ASC']],
        limit: 500,
      });
    }

    // Build a unified, sorted timeline.
    const timeline = [
      ...logs.map(l => ({
        kind: 'activity',
        timestamp: l.created_at,
        action: l.action,
        description: l.description,
        actor: l.User ? `${l.User.first_name} ${l.User.last_name}` : null,
        metadata: l.metadata || null,
      })),
      ...scans.map(s => ({
        kind: 'scan',
        timestamp: s.scanned_at,
        action: `qr_${s.qr_type}`,
        description: `Scanned ${s.qr_type.replace(/_/g, ' ')} QR`,
        actor: s.scanner ? `${s.scanner.first_name} ${s.scanner.last_name}` : null,
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      ...reports.map(r => ({
        kind: 'report',
        timestamp: r.uploaded_at,
        action: 'report_uploaded',
        description: r.description || `Uploaded ${r.report_type}`,
        actor: r.uploader ? `${r.uploader.first_name} ${r.uploader.last_name}` : null,
        file_url: r.file_url,
        file_type: r.file_type,
        report_type: r.report_type,
        report_id: r.id,
      })),
    ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    res.json({ job, timeline, gps_track: gpsTrack });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRecentActivity,
  getUserActivity,
  getOperatorActivityReport,
  getJobActivityTimeline,
};
