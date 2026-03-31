'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Users
    await queryInterface.createTable('users', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      email: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      phone: { type: Sequelize.STRING(20) },
      role: { type: Sequelize.STRING(50), allowNull: false },
      status: { type: Sequelize.STRING(20), defaultValue: 'active' },
      avatar_url: { type: Sequelize.TEXT },
      fcm_token: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Customers
    await queryInterface.createTable('customers', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      company_name: { type: Sequelize.STRING(255), allowNull: false },
      contact_person: { type: Sequelize.STRING(200) },
      email: { type: Sequelize.STRING(255) },
      phone: { type: Sequelize.STRING(20) },
      address: { type: Sequelize.TEXT, allowNull: false },
      latitude: { type: Sequelize.DOUBLE },
      longitude: { type: Sequelize.DOUBLE },
      partner_tier: { type: Sequelize.STRING(50), defaultValue: 'standard' },
      qr_code: { type: Sequelize.TEXT },
      notes: { type: Sequelize.TEXT },
      status: { type: Sequelize.STRING(20), defaultValue: 'active' },
      portal_password_hash: { type: Sequelize.STRING(255) },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Vehicles
    await queryInterface.createTable('vehicles', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      plate_number: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100) },
      model: { type: Sequelize.STRING(100) },
      status: { type: Sequelize.STRING(50), defaultValue: 'available' },
      latitude: { type: Sequelize.DOUBLE },
      longitude: { type: Sequelize.DOUBLE },
      last_location_update: { type: Sequelize.DATE },
      fuel_level: { type: Sequelize.INTEGER, defaultValue: 100 },
      assigned_driver_id: { type: Sequelize.UUID, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      robot_capacity: { type: Sequelize.INTEGER, defaultValue: 2 },
      last_service_date: { type: Sequelize.DATEONLY },
      next_service_date: { type: Sequelize.DATEONLY },
      qr_code: { type: Sequelize.TEXT, unique: true },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Contracts
    await queryInterface.createTable('contracts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      contract_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'customers', key: 'id' }, onDelete: 'CASCADE' },
      contract_type: { type: Sequelize.STRING(50), allowNull: false },
      frequency: { type: Sequelize.STRING(50) },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY },
      total_value: { type: Sequelize.DECIMAL(12, 2) },
      currency: { type: Sequelize.STRING(10), defaultValue: 'QAR' },
      status: { type: Sequelize.STRING(50), defaultValue: 'active' },
      auto_renew: { type: Sequelize.BOOLEAN, defaultValue: false },
      terms: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Job Templates
    await queryInterface.createTable('job_templates', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      category: { type: Sequelize.STRING(100) },
      service_type: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      pricing_model: { type: Sequelize.STRING(50) },
      base_price: { type: Sequelize.DECIMAL(10, 2) },
      currency: { type: Sequelize.STRING(10), defaultValue: 'QAR' },
      estimated_duration_minutes: { type: Sequelize.INTEGER },
      robots_required: { type: Sequelize.INTEGER, defaultValue: 1 },
      usage_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Jobs
    await queryInterface.createTable('jobs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      job_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'customers', key: 'id' } },
      contract_id: { type: Sequelize.UUID, references: { model: 'contracts', key: 'id' } },
      template_id: { type: Sequelize.UUID, references: { model: 'job_templates', key: 'id' } },
      service_type: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      scheduled_date: { type: Sequelize.DATEONLY, allowNull: false },
      scheduled_time: { type: Sequelize.TIME, allowNull: false },
      estimated_duration_minutes: { type: Sequelize.INTEGER },
      actual_duration_minutes: { type: Sequelize.INTEGER },
      status: { type: Sequelize.STRING(50), defaultValue: 'scheduled' },
      priority: { type: Sequelize.STRING(20), defaultValue: 'normal' },
      assigned_operator_id: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      assigned_vehicle_id: { type: Sequelize.UUID, references: { model: 'vehicles', key: 'id' } },
      assigned_robot_id: { type: Sequelize.UUID },
      hourly_rate: { type: Sequelize.DECIMAL(10, 2) },
      total_cost: { type: Sequelize.DECIMAL(10, 2) },
      currency: { type: Sequelize.STRING(10), defaultValue: 'QAR' },
      is_recurring: { type: Sequelize.BOOLEAN, defaultValue: false },
      arrival_time: { type: Sequelize.DATE },
      start_time: { type: Sequelize.DATE },
      completion_time: { type: Sequelize.DATE },
      customer_latitude: { type: Sequelize.DOUBLE },
      customer_longitude: { type: Sequelize.DOUBLE },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Robots (after jobs for FK)
    await queryInterface.createTable('robots', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      serial_number: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(100) },
      model: { type: Sequelize.STRING(100) },
      firmware_version: { type: Sequelize.STRING(50) },
      status: { type: Sequelize.STRING(50), defaultValue: 'available' },
      battery_level: { type: Sequelize.INTEGER, defaultValue: 100 },
      total_operational_hours: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      jobs_completed: { type: Sequelize.INTEGER, defaultValue: 0 },
      last_maintenance_date: { type: Sequelize.DATEONLY },
      next_maintenance_date: { type: Sequelize.DATEONLY },
      qr_code: { type: Sequelize.TEXT, unique: true },
      latitude: { type: Sequelize.DOUBLE },
      longitude: { type: Sequelize.DOUBLE },
      assigned_vehicle_id: { type: Sequelize.UUID, references: { model: 'vehicles', key: 'id' }, onDelete: 'SET NULL' },
      assigned_job_id: { type: Sequelize.UUID, references: { model: 'jobs', key: 'id' }, onDelete: 'SET NULL' },
      health_status: { type: Sequelize.STRING(20), defaultValue: 'good' },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Add robot FK to jobs
    await queryInterface.addConstraint('jobs', {
      fields: ['assigned_robot_id'],
      type: 'foreign key',
      name: 'fk_job_robot',
      references: { table: 'robots', field: 'id' },
      onDelete: 'SET NULL',
    });

    // Job Reports
    await queryInterface.createTable('job_reports', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      job_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'jobs', key: 'id' }, onDelete: 'CASCADE' },
      uploaded_by: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      report_type: { type: Sequelize.STRING(50), defaultValue: 'cleaning_report' },
      file_url: { type: Sequelize.TEXT, allowNull: false },
      file_type: { type: Sequelize.STRING(50) },
      description: { type: Sequelize.TEXT },
      uploaded_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Invoices
    await queryInterface.createTable('invoices', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      invoice_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      customer_id: { type: Sequelize.UUID, allowNull: false, references: { model: 'customers', key: 'id' } },
      contract_id: { type: Sequelize.UUID, references: { model: 'contracts', key: 'id' } },
      job_id: { type: Sequelize.UUID, references: { model: 'jobs', key: 'id' } },
      amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      tax_amount: { type: Sequelize.DECIMAL(12, 2), defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(12, 2), allowNull: false },
      currency: { type: Sequelize.STRING(10), defaultValue: 'QAR' },
      status: { type: Sequelize.STRING(50), defaultValue: 'pending' },
      issue_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: false },
      paid_date: { type: Sequelize.DATEONLY },
      payment_method: { type: Sequelize.STRING(50) },
      notes: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Location History
    await queryInterface.createTable('location_history', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      entity_type: { type: Sequelize.STRING(20), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: false },
      latitude: { type: Sequelize.DOUBLE, allowNull: false },
      longitude: { type: Sequelize.DOUBLE, allowNull: false },
      speed: { type: Sequelize.DECIMAL(5, 2) },
      heading: { type: Sequelize.DECIMAL(5, 2) },
      accuracy: { type: Sequelize.DECIMAL(10, 2) },
      recorded_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('location_history', ['entity_type', 'entity_id', 'recorded_at']);

    // Alerts
    await queryInterface.createTable('alerts', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      type: { type: Sequelize.STRING(50), allowNull: false },
      severity: { type: Sequelize.STRING(20), defaultValue: 'info' },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50) },
      related_entity_id: { type: Sequelize.UUID },
      target_user_id: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      is_read: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_pushed: { type: Sequelize.BOOLEAN, defaultValue: false },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // QR Scan Logs
    await queryInterface.createTable('qr_scan_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      scanned_by: { type: Sequelize.UUID, allowNull: false, references: { model: 'users', key: 'id' } },
      job_id: { type: Sequelize.UUID, references: { model: 'jobs', key: 'id' } },
      qr_type: { type: Sequelize.STRING(50), allowNull: false },
      qr_code: { type: Sequelize.TEXT, allowNull: false },
      scanned_entity_type: { type: Sequelize.STRING(50) },
      scanned_entity_id: { type: Sequelize.UUID },
      latitude: { type: Sequelize.DOUBLE },
      longitude: { type: Sequelize.DOUBLE },
      scanned_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Activity Logs
    await queryInterface.createTable('activity_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: { type: Sequelize.UUID, references: { model: 'users', key: 'id' } },
      action: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.TEXT },
      entity_type: { type: Sequelize.STRING(50) },
      entity_id: { type: Sequelize.UUID },
      metadata: { type: Sequelize.JSONB },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Settings
    await queryInterface.createTable('settings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      key: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      value: { type: Sequelize.TEXT },
      description: { type: Sequelize.TEXT },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
    });

    // Indexes
    await queryInterface.addIndex('jobs', ['status']);
    await queryInterface.addIndex('jobs', ['scheduled_date', 'scheduled_time']);
    await queryInterface.addIndex('jobs', ['assigned_operator_id']);
    await queryInterface.addIndex('robots', ['status']);
    await queryInterface.addIndex('vehicles', ['status']);
    await queryInterface.addIndex('alerts', ['target_user_id', 'is_read']);
    await queryInterface.addIndex('invoices', ['status']);
    await queryInterface.addIndex('invoices', ['customer_id']);
    await queryInterface.addIndex('contracts', ['customer_id']);
    await queryInterface.addIndex('contracts', ['status']);
  },

  async down(queryInterface) {
    const tables = [
      'settings', 'activity_logs', 'qr_scan_logs', 'alerts', 'location_history',
      'invoices', 'job_reports', 'robots', 'jobs', 'job_templates', 'contracts',
      'vehicles', 'customers', 'users',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table, { cascade: true });
    }
  },
};
