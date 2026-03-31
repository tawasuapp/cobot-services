// Shared constants for Cobot Services platform

const USER_ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  ROBOT_OPERATOR: 'robot_operator',
  DRIVER: 'driver',
};

const USER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  AWAY: 'away',
};

const CUSTOMER_STATUSES = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

const PARTNER_TIERS = {
  STANDARD: 'standard',
  SILVER: 'silver',
  GOLD: 'gold',
  PLATINUM: 'platinum',
};

const ROBOT_STATUSES = {
  AVAILABLE: 'available',
  DEPLOYED: 'deployed',
  CLEANING: 'cleaning',
  RETURNING: 'returning',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
};

const ROBOT_HEALTH = {
  GOOD: 'good',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

const VEHICLE_STATUSES = {
  ACTIVE: 'active',
  AVAILABLE: 'available',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
};

const JOB_STATUSES = {
  SCHEDULED: 'scheduled',
  ASSIGNED: 'assigned',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
};

const JOB_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

const CONTRACT_TYPES = {
  ONE_TIME: 'one_time',
  RECURRING: 'recurring',
};

const CONTRACT_FREQUENCIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  BIWEEKLY: 'biweekly',
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
};

const CONTRACT_STATUSES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

const TEMPLATE_CATEGORIES = {
  INTERIOR: 'interior',
  EXTERIOR: 'exterior',
  DEEP_CLEAN: 'deep_clean',
  MAINTENANCE: 'maintenance',
};

const PRICING_MODELS = {
  HOURLY_RATE: 'hourly_rate',
  FIXED_PRICE: 'fixed_price',
  PER_ROBOT: 'per_robot',
};

const INVOICE_STATUSES = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
};

const REPORT_TYPES = {
  CLEANING_REPORT: 'cleaning_report',
  MAP_SCREENSHOT: 'map_screenshot',
  ISSUE_REPORT: 'issue_report',
  PHOTO: 'photo',
};

const ALERT_TYPES = {
  LATE_ARRIVAL: 'late_arrival',
  JOB_DELAY: 'job_delay',
  MAINTENANCE_DUE: 'maintenance_due',
  PAYMENT_OVERDUE: 'payment_overdue',
  SYSTEM: 'system',
  ARRIVAL_NOTIFICATION: 'arrival_notification',
};

const ALERT_SEVERITIES = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
};

const QR_TYPES = {
  CUSTOMER_LOCATION: 'customer_location',
  ROBOT_DEPLOY: 'robot_deploy',
  ROBOT_RETURN: 'robot_return',
  VEHICLE_RETURN: 'vehicle_return',
};

const ENTITY_TYPES = {
  VEHICLE: 'vehicle',
  ROBOT: 'robot',
  USER: 'user',
};

const DEFAULT_CURRENCY = 'QAR';

module.exports = {
  USER_ROLES,
  USER_STATUSES,
  CUSTOMER_STATUSES,
  PARTNER_TIERS,
  ROBOT_STATUSES,
  ROBOT_HEALTH,
  VEHICLE_STATUSES,
  JOB_STATUSES,
  JOB_PRIORITIES,
  CONTRACT_TYPES,
  CONTRACT_FREQUENCIES,
  CONTRACT_STATUSES,
  TEMPLATE_CATEGORIES,
  PRICING_MODELS,
  INVOICE_STATUSES,
  REPORT_TYPES,
  ALERT_TYPES,
  ALERT_SEVERITIES,
  QR_TYPES,
  ENTITY_TYPES,
  DEFAULT_CURRENCY,
};
