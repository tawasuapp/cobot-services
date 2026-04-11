const { Sequelize, DataTypes } = require('sequelize');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const config = dbConfig[env];

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// ─── USER ───────────────────────────────────────────────
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  phone: DataTypes.STRING(20),
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['admin', 'supervisor', 'robot_operator', 'driver']] },
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    validate: { isIn: [['active', 'inactive', 'away']] },
  },
  avatar_url: DataTypes.TEXT,
  fcm_token: DataTypes.TEXT,
}, {
  tableName: 'users',
  underscored: true,
});

// ─── CUSTOMER ───────────────────────────────────────────
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  contact_person: DataTypes.STRING(200),
  email: DataTypes.STRING(255),
  phone: DataTypes.STRING(20),
  address: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  partner_tier: {
    type: DataTypes.STRING(50),
    defaultValue: 'standard',
    validate: { isIn: [['standard', 'silver', 'gold', 'platinum']] },
  },
  qr_code: DataTypes.TEXT,
  robot_map: DataTypes.TEXT,
  robots_required: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  non_robot_activities: DataTypes.TEXT,
  notes: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'active',
    validate: { isIn: [['active', 'inactive']] },
  },
  portal_password_hash: DataTypes.STRING(255),
}, {
  tableName: 'customers',
  underscored: true,
});

// ─── ROBOT ──────────────────────────────────────────────
const Robot = sequelize.define('Robot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  serial_number: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  name: DataTypes.STRING(100),
  model: DataTypes.STRING(100),
  firmware_version: DataTypes.STRING(50),
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'available',
    validate: { isIn: [['available', 'deployed', 'cleaning', 'returning', 'maintenance', 'offline']] },
  },
  battery_level: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: { min: 0, max: 100 },
  },
  total_operational_hours: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  jobs_completed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  last_maintenance_date: DataTypes.DATEONLY,
  next_maintenance_date: DataTypes.DATEONLY,
  qr_code: {
    type: DataTypes.TEXT,
    unique: true,
  },
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  assigned_vehicle_id: DataTypes.UUID,
  assigned_job_id: DataTypes.UUID,
  health_status: {
    type: DataTypes.STRING(20),
    defaultValue: 'good',
    validate: { isIn: [['good', 'warning', 'critical']] },
  },
  notes: DataTypes.TEXT,
}, {
  tableName: 'robots',
  underscored: true,
});

// ─── VEHICLE ────────────────────────────────────────────
const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  plate_number: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  name: DataTypes.STRING(100),
  model: DataTypes.STRING(100),
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'available',
    validate: { isIn: [['active', 'available', 'maintenance', 'offline']] },
  },
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  last_location_update: DataTypes.DATE,
  fuel_level: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: { min: 0, max: 100 },
  },
  assigned_driver_id: DataTypes.UUID,
  robot_capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 2,
  },
  last_service_date: DataTypes.DATEONLY,
  next_service_date: DataTypes.DATEONLY,
  qr_code: {
    type: DataTypes.TEXT,
    unique: true,
  },
  notes: DataTypes.TEXT,
}, {
  tableName: 'vehicles',
  underscored: true,
});

// ─── CONTRACT ───────────────────────────────────────────
const Contract = sequelize.define('Contract', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contract_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  contract_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['one_time', 'recurring']] },
  },
  frequency: {
    type: DataTypes.STRING(50),
    validate: { isIn: [['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', null]] },
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  end_date: DataTypes.DATEONLY,
  total_value: DataTypes.DECIMAL(12, 2),
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'QAR',
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'active',
    validate: { isIn: [['draft', 'active', 'completed', 'cancelled', 'expired']] },
  },
  auto_renew: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  terms: DataTypes.TEXT,
}, {
  tableName: 'contracts',
  underscored: true,
});

// ─── JOB TEMPLATE ───────────────────────────────────────
const JobTemplate = sequelize.define('JobTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    validate: { isIn: [['interior', 'exterior', 'deep_clean', 'maintenance']] },
  },
  service_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: DataTypes.TEXT,
  pricing_model: {
    type: DataTypes.STRING(50),
    validate: { isIn: [['hourly_rate', 'fixed_price', 'per_robot']] },
  },
  base_price: DataTypes.DECIMAL(10, 2),
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'QAR',
  },
  estimated_duration_minutes: DataTypes.INTEGER,
  robots_required: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'job_templates',
  underscored: true,
});

// ─── JOB ────────────────────────────────────────────────
const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  job_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  contract_id: DataTypes.UUID,
  template_id: DataTypes.UUID,
  service_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: DataTypes.TEXT,
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  scheduled_time: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  estimated_duration_minutes: DataTypes.INTEGER,
  actual_duration_minutes: DataTypes.INTEGER,
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'scheduled',
    validate: { isIn: [['scheduled', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled', 'failed']] },
  },
  priority: {
    type: DataTypes.STRING(20),
    defaultValue: 'normal',
    validate: { isIn: [['low', 'normal', 'high', 'urgent']] },
  },
  assigned_operator_id: DataTypes.UUID,
  assigned_vehicle_id: DataTypes.UUID,
  assigned_robot_id: DataTypes.UUID,
  assigned_robot_ids: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  hourly_rate: DataTypes.DECIMAL(10, 2),
  total_cost: DataTypes.DECIMAL(10, 2),
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'QAR',
  },
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  arrival_time: DataTypes.DATE,
  start_time: DataTypes.DATE,
  completion_time: DataTypes.DATE,
  customer_latitude: DataTypes.DOUBLE,
  customer_longitude: DataTypes.DOUBLE,
  notes: DataTypes.TEXT,
}, {
  tableName: 'jobs',
  underscored: true,
});

// ─── JOB REPORT ─────────────────────────────────────────
const JobReport = sequelize.define('JobReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  job_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  uploaded_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  report_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'cleaning_report',
    validate: { isIn: [['cleaning_report', 'map_screenshot', 'issue_report', 'photo']] },
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  file_type: DataTypes.STRING(50),
  description: DataTypes.TEXT,
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'job_reports',
  underscored: true,
  timestamps: false,
});

// ─── INVOICE ────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  invoice_number: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  customer_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  contract_id: DataTypes.UUID,
  job_id: DataTypes.UUID,
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(10),
    defaultValue: 'QAR',
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
    validate: { isIn: [['draft', 'pending', 'paid', 'overdue', 'cancelled']] },
  },
  issue_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  paid_date: DataTypes.DATEONLY,
  payment_method: DataTypes.STRING(50),
  notes: DataTypes.TEXT,
}, {
  tableName: 'invoices',
  underscored: true,
});

// ─── LOCATION HISTORY ───────────────────────────────────
const LocationHistory = sequelize.define('LocationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  entity_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['vehicle', 'robot', 'user']] },
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  latitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  longitude: {
    type: DataTypes.DOUBLE,
    allowNull: false,
  },
  speed: DataTypes.DECIMAL(5, 2),
  heading: DataTypes.DECIMAL(5, 2),
  accuracy: DataTypes.DECIMAL(10, 2),
  recorded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'location_history',
  underscored: true,
  timestamps: false,
});

// ─── ALERT ──────────────────────────────────────────────
const Alert = sequelize.define('Alert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['late_arrival', 'job_delay', 'maintenance_due', 'payment_overdue', 'system', 'arrival_notification']] },
  },
  severity: {
    type: DataTypes.STRING(20),
    defaultValue: 'info',
    validate: { isIn: [['info', 'warning', 'critical']] },
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  related_entity_type: DataTypes.STRING(50),
  related_entity_id: DataTypes.UUID,
  target_user_id: DataTypes.UUID,
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  is_pushed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'alerts',
  underscored: true,
  updatedAt: false,
});

// ─── QR SCAN LOG ────────────────────────────────────────
const QRScanLog = sequelize.define('QRScanLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  scanned_by: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  job_id: DataTypes.UUID,
  qr_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['customer_location', 'robot_deploy', 'robot_return', 'vehicle_return']] },
  },
  qr_code: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  scanned_entity_type: DataTypes.STRING(50),
  scanned_entity_id: DataTypes.UUID,
  latitude: DataTypes.DOUBLE,
  longitude: DataTypes.DOUBLE,
  scanned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'qr_scan_logs',
  underscored: true,
  timestamps: false,
});

// ─── ACTIVITY LOG ───────────────────────────────────────
const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: DataTypes.UUID,
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: DataTypes.TEXT,
  entity_type: DataTypes.STRING(50),
  entity_id: DataTypes.UUID,
  metadata: DataTypes.JSONB,
}, {
  tableName: 'activity_logs',
  underscored: true,
  updatedAt: false,
});

// ─── SETTINGS ───────────────────────────────────────────
const Setting = sequelize.define('Setting', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: DataTypes.TEXT,
  description: DataTypes.TEXT,
}, {
  tableName: 'settings',
  underscored: true,
  createdAt: false,
});

// ─── ASSOCIATIONS ───────────────────────────────────────

// Vehicle -> Driver (User)
Vehicle.belongsTo(User, { as: 'driver', foreignKey: 'assigned_driver_id' });
User.hasMany(Vehicle, { as: 'assigned_vehicles', foreignKey: 'assigned_driver_id' });

// Robot -> Vehicle
Robot.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'assigned_vehicle_id' });
Vehicle.hasMany(Robot, { as: 'robots', foreignKey: 'assigned_vehicle_id' });

// Robot -> Job
Robot.belongsTo(Job, { as: 'currentJob', foreignKey: 'assigned_job_id' });

// Contract -> Customer
Contract.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Contract, { foreignKey: 'customer_id' });

// Job -> Customer
Job.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Job, { foreignKey: 'customer_id' });

// Job -> Contract
Job.belongsTo(Contract, { foreignKey: 'contract_id' });
Contract.hasMany(Job, { foreignKey: 'contract_id' });

// Job -> Template
Job.belongsTo(JobTemplate, { as: 'template', foreignKey: 'template_id' });

// Job -> Operator (User)
Job.belongsTo(User, { as: 'operator', foreignKey: 'assigned_operator_id' });
User.hasMany(Job, { as: 'assigned_jobs', foreignKey: 'assigned_operator_id' });

// Job -> Vehicle
Job.belongsTo(Vehicle, { as: 'vehicle', foreignKey: 'assigned_vehicle_id' });

// Job -> Robot
Job.belongsTo(Robot, { as: 'robot', foreignKey: 'assigned_robot_id' });

// JobReport -> Job
JobReport.belongsTo(Job, { foreignKey: 'job_id' });
Job.hasMany(JobReport, { as: 'reports', foreignKey: 'job_id' });

// JobReport -> User
JobReport.belongsTo(User, { as: 'uploader', foreignKey: 'uploaded_by' });

// Invoice -> Customer
Invoice.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Invoice, { foreignKey: 'customer_id' });

// Invoice -> Contract
Invoice.belongsTo(Contract, { foreignKey: 'contract_id' });

// Invoice -> Job
Invoice.belongsTo(Job, { foreignKey: 'job_id' });

// Alert -> User
Alert.belongsTo(User, { as: 'targetUser', foreignKey: 'target_user_id' });

// QRScanLog -> User
QRScanLog.belongsTo(User, { as: 'scanner', foreignKey: 'scanned_by' });
QRScanLog.belongsTo(Job, { foreignKey: 'job_id' });

// ActivityLog -> User
ActivityLog.belongsTo(User, { foreignKey: 'user_id' });

// ─── HELPER: Get Setting Value ──────────────────────────
Setting.getValue = async function(key) {
  const setting = await this.findOne({ where: { key } });
  return setting ? setting.value : null;
};

module.exports = {
  sequelize,
  Sequelize,
  User,
  Customer,
  Robot,
  Vehicle,
  Contract,
  JobTemplate,
  Job,
  JobReport,
  Invoice,
  LocationHistory,
  Alert,
  QRScanLog,
  ActivityLog,
  Setting,
};
