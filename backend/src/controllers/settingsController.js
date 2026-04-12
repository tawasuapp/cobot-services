const { Setting } = require('../models');

// Defaults applied when a setting key has no row yet.
const DEFAULTS = {
  arrival_radius: '100',
  location_update_interval: '30',
  late_arrival_threshold: '15',
  notifications: JSON.stringify({
    email_job_assigned: true,
    email_job_completed: true,
    email_payment_received: true,
    email_maintenance_due: false,
    push_new_alert: true,
    push_late_arrival: true,
    push_system_updates: false,
    sms_critical_alerts: true,
    sms_payment_overdue: false,
  }),
  role_permissions: JSON.stringify({
    admin: { dashboard: true, live_ops: true, jobs: true, customers: true, robots: true, vehicles: true, finance: true, analytics: true, alerts: true, settings: true, reports: true },
    supervisor: { dashboard: true, live_ops: true, jobs: true, customers: true, robots: true, vehicles: true, finance: true, analytics: true, alerts: true, settings: false, reports: true },
    robot_operator: { dashboard: true, live_ops: false, jobs: true, customers: false, robots: false, vehicles: false, finance: false, analytics: false, alerts: true, settings: false, reports: true },
    driver: { dashboard: true, live_ops: false, jobs: true, customers: false, robots: false, vehicles: false, finance: false, analytics: false, alerts: true, settings: false, reports: false },
  }),
};

function parseValue(raw) {
  if (raw == null) return null;
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try { return JSON.parse(trimmed); } catch { /* fall through */ }
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return raw;
}

async function getAll(req, res, next) {
  try {
    const rows = await Setting.findAll();
    const out = {};
    for (const [k, v] of Object.entries(DEFAULTS)) out[k] = parseValue(v);
    for (const r of rows) out[r.key] = parseValue(r.value);
    res.json(out);
  } catch (err) { next(err); }
}

async function getOne(req, res, next) {
  try {
    const row = await Setting.findOne({ where: { key: req.params.key } });
    const raw = row ? row.value : DEFAULTS[req.params.key];
    if (raw == null) return res.status(404).json({ error: 'Setting not found' });
    res.json({ key: req.params.key, value: parseValue(raw) });
  } catch (err) { next(err); }
}

async function updateBulk(req, res, next) {
  try {
    const updates = req.body || {};
    const out = {};
    for (const [key, value] of Object.entries(updates)) {
      const stored = typeof value === 'string' ? value : JSON.stringify(value);
      const [row] = await Setting.findOrCreate({ where: { key }, defaults: { key, value: stored } });
      if (row.value !== stored) {
        row.value = stored;
        await row.save();
      }
      out[key] = parseValue(stored);
    }
    res.json(out);
  } catch (err) { next(err); }
}

module.exports = { getAll, getOne, updateBulk, DEFAULTS };
