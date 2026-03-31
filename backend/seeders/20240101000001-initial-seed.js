'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const salt = await bcrypt.genSalt(10);

    // Users
    const adminId = uuidv4();
    const supervisorId = uuidv4();
    const operator1Id = uuidv4();
    const operator2Id = uuidv4();
    const driverId = uuidv4();

    await queryInterface.bulkInsert('users', [
      {
        id: adminId,
        email: 'admin@cobot.qa',
        password_hash: await bcrypt.hash('admin123', salt),
        first_name: 'Admin',
        last_name: 'User',
        phone: '+974-5500-0001',
        role: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: supervisorId,
        email: 'supervisor@cobot.qa',
        password_hash: await bcrypt.hash('super123', salt),
        first_name: 'Ahmed',
        last_name: 'Al-Thani',
        phone: '+974-5500-0002',
        role: 'supervisor',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: operator1Id,
        email: 'operator1@cobot.qa',
        password_hash: await bcrypt.hash('oper123', salt),
        first_name: 'Mohammed',
        last_name: 'Hassan',
        phone: '+974-5500-0003',
        role: 'robot_operator',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: operator2Id,
        email: 'operator2@cobot.qa',
        password_hash: await bcrypt.hash('oper123', salt),
        first_name: 'Ali',
        last_name: 'Al-Mahmoud',
        phone: '+974-5500-0004',
        role: 'robot_operator',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: driverId,
        email: 'driver1@cobot.qa',
        password_hash: await bcrypt.hash('driver123', salt),
        first_name: 'Khalid',
        last_name: 'Al-Dosari',
        phone: '+974-5500-0005',
        role: 'driver',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Customers
    const customer1Id = uuidv4();
    const customer2Id = uuidv4();
    const customer3Id = uuidv4();
    const customer4Id = uuidv4();

    await queryInterface.bulkInsert('customers', [
      {
        id: customer1Id,
        company_name: 'Tech Plaza Qatar',
        contact_person: 'Sarah Johnson',
        email: 'info@techplaza.qa',
        phone: '+974-4400-1001',
        address: 'West Bay Tower 3, Floor 12, Doha',
        latitude: 25.3195,
        longitude: 51.5265,
        partner_tier: 'gold',
        status: 'active',
        portal_password_hash: await bcrypt.hash('customer123', salt),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: customer2Id,
        company_name: 'Green Gardens Mall',
        contact_person: 'Omar Farouk',
        email: 'facilities@greengardens.qa',
        phone: '+974-4400-1002',
        address: 'Al Gharafa Street 22, Doha',
        latitude: 25.3375,
        longitude: 51.4305,
        partner_tier: 'platinum',
        status: 'active',
        portal_password_hash: await bcrypt.hash('customer123', salt),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: customer3Id,
        company_name: 'Pearl Island Resort',
        contact_person: 'Fatima Al-Zahra',
        email: 'ops@pearlisland.qa',
        phone: '+974-4400-1003',
        address: 'The Pearl, Porto Arabia, Doha',
        latitude: 25.3687,
        longitude: 51.5510,
        partner_tier: 'silver',
        status: 'active',
        portal_password_hash: await bcrypt.hash('customer123', salt),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: customer4Id,
        company_name: 'Lusail Sports Complex',
        contact_person: 'Nasser Al-Khelaifi',
        email: 'maintenance@lusailsports.qa',
        phone: '+974-4400-1004',
        address: 'Lusail Boulevard, Lusail City',
        latitude: 25.4195,
        longitude: 51.4905,
        partner_tier: 'standard',
        status: 'active',
        portal_password_hash: await bcrypt.hash('customer123', salt),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Vehicles
    const vehicle1Id = uuidv4();
    const vehicle2Id = uuidv4();
    const vehicle3Id = uuidv4();

    await queryInterface.bulkInsert('vehicles', [
      {
        id: vehicle1Id,
        plate_number: 'QA-12345',
        name: 'Van Alpha',
        model: 'Toyota HiAce 2024',
        status: 'available',
        latitude: 25.2854,
        longitude: 51.5310,
        fuel_level: 85,
        assigned_driver_id: driverId,
        robot_capacity: 3,
        last_service_date: '2024-02-15',
        next_service_date: '2024-05-15',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: vehicle2Id,
        plate_number: 'QA-67890',
        name: 'Van Bravo',
        model: 'Toyota HiAce 2024',
        status: 'available',
        latitude: 25.2900,
        longitude: 51.5200,
        fuel_level: 92,
        robot_capacity: 3,
        last_service_date: '2024-01-20',
        next_service_date: '2024-04-20',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: vehicle3Id,
        plate_number: 'QA-11111',
        name: 'Van Charlie',
        model: 'Nissan Urvan 2023',
        status: 'maintenance',
        fuel_level: 50,
        robot_capacity: 2,
        last_service_date: '2024-03-01',
        next_service_date: '2024-06-01',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Robots
    const robot1Id = uuidv4();
    const robot2Id = uuidv4();
    const robot3Id = uuidv4();
    const robot4Id = uuidv4();
    const robot5Id = uuidv4();

    await queryInterface.bulkInsert('robots', [
      {
        id: robot1Id,
        serial_number: 'COBOT-2024-001',
        name: 'Cobot Alpha',
        model: 'CleanBot Pro X1',
        firmware_version: '2.4.1',
        status: 'available',
        battery_level: 95,
        total_operational_hours: 120.5,
        jobs_completed: 45,
        last_maintenance_date: '2024-02-20',
        next_maintenance_date: '2024-05-20',
        health_status: 'good',
        assigned_vehicle_id: vehicle1Id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: robot2Id,
        serial_number: 'COBOT-2024-002',
        name: 'Cobot Bravo',
        model: 'CleanBot Pro X1',
        firmware_version: '2.4.1',
        status: 'available',
        battery_level: 88,
        total_operational_hours: 98.3,
        jobs_completed: 38,
        last_maintenance_date: '2024-02-10',
        next_maintenance_date: '2024-05-10',
        health_status: 'good',
        assigned_vehicle_id: vehicle1Id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: robot3Id,
        serial_number: 'COBOT-2024-003',
        name: 'Cobot Charlie',
        model: 'CleanBot Pro X2',
        firmware_version: '3.0.0',
        status: 'available',
        battery_level: 100,
        total_operational_hours: 55.7,
        jobs_completed: 22,
        health_status: 'good',
        assigned_vehicle_id: vehicle2Id,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: robot4Id,
        serial_number: 'COBOT-2024-004',
        name: 'Cobot Delta',
        model: 'CleanBot Pro X2',
        firmware_version: '3.0.0',
        status: 'maintenance',
        battery_level: 30,
        total_operational_hours: 200.0,
        jobs_completed: 78,
        last_maintenance_date: '2024-03-01',
        next_maintenance_date: '2024-03-15',
        health_status: 'warning',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: robot5Id,
        serial_number: 'COBOT-2024-005',
        name: 'Cobot Echo',
        model: 'CleanBot Lite L1',
        firmware_version: '1.2.0',
        status: 'available',
        battery_level: 75,
        total_operational_hours: 300.2,
        jobs_completed: 112,
        health_status: 'good',
        assigned_vehicle_id: vehicle2Id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Job Templates
    await queryInterface.bulkInsert('job_templates', [
      {
        id: uuidv4(),
        name: 'Standard Floor Cleaning',
        category: 'interior',
        service_type: 'Floor Cleaning',
        description: 'Complete floor cleaning including sweeping, mopping, and polishing',
        pricing_model: 'hourly_rate',
        base_price: 150.00,
        currency: 'QAR',
        estimated_duration_minutes: 120,
        robots_required: 1,
        usage_count: 25,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Deep Clean Package',
        category: 'deep_clean',
        service_type: 'Deep Cleaning',
        description: 'Thorough deep cleaning of all surfaces, carpets, and hard-to-reach areas',
        pricing_model: 'fixed_price',
        base_price: 500.00,
        currency: 'QAR',
        estimated_duration_minutes: 240,
        robots_required: 2,
        usage_count: 10,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        name: 'Exterior Walkway Clean',
        category: 'exterior',
        service_type: 'Exterior Cleaning',
        description: 'Cleaning of exterior walkways, parking areas, and entrance zones',
        pricing_model: 'per_robot',
        base_price: 200.00,
        currency: 'QAR',
        estimated_duration_minutes: 180,
        robots_required: 1,
        usage_count: 15,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Contracts
    const contract1Id = uuidv4();
    const contract2Id = uuidv4();

    await queryInterface.bulkInsert('contracts', [
      {
        id: contract1Id,
        contract_number: 'CTR-2024-0001',
        customer_id: customer1Id,
        contract_type: 'recurring',
        frequency: 'weekly',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        total_value: 36000.00,
        currency: 'QAR',
        status: 'active',
        auto_renew: true,
        terms: 'Weekly floor cleaning service, Monday mornings. Includes 1 robot deployment.',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: contract2Id,
        contract_number: 'CTR-2024-0002',
        customer_id: customer2Id,
        contract_type: 'recurring',
        frequency: 'daily',
        start_date: '2024-01-15',
        end_date: '2025-01-14',
        total_value: 120000.00,
        currency: 'QAR',
        status: 'active',
        auto_renew: false,
        terms: 'Daily cleaning service for mall common areas. 2 robots deployed daily.',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Jobs
    const today = new Date().toISOString().split('T')[0];

    await queryInterface.bulkInsert('jobs', [
      {
        id: uuidv4(),
        job_number: 'JOB-240301-0001',
        customer_id: customer1Id,
        contract_id: contract1Id,
        service_type: 'Floor Cleaning',
        description: 'Weekly floor cleaning - Lobby and corridors',
        scheduled_date: today,
        scheduled_time: '09:00:00',
        estimated_duration_minutes: 120,
        status: 'scheduled',
        priority: 'normal',
        assigned_operator_id: operator1Id,
        assigned_vehicle_id: vehicle1Id,
        assigned_robot_id: robot1Id,
        hourly_rate: 150.00,
        currency: 'QAR',
        is_recurring: true,
        customer_latitude: 25.3195,
        customer_longitude: 51.5265,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        job_number: 'JOB-240301-0002',
        customer_id: customer2Id,
        contract_id: contract2Id,
        service_type: 'Deep Cleaning',
        description: 'Daily deep clean - Food court area',
        scheduled_date: today,
        scheduled_time: '11:30:00',
        estimated_duration_minutes: 180,
        status: 'assigned',
        priority: 'high',
        assigned_operator_id: operator1Id,
        assigned_vehicle_id: vehicle1Id,
        assigned_robot_id: robot2Id,
        hourly_rate: 200.00,
        currency: 'QAR',
        is_recurring: true,
        customer_latitude: 25.3375,
        customer_longitude: 51.4305,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        job_number: 'JOB-240301-0003',
        customer_id: customer3Id,
        service_type: 'Exterior Cleaning',
        description: 'Walkway and entrance cleaning',
        scheduled_date: today,
        scheduled_time: '14:00:00',
        estimated_duration_minutes: 150,
        status: 'scheduled',
        priority: 'normal',
        assigned_operator_id: operator2Id,
        assigned_vehicle_id: vehicle2Id,
        assigned_robot_id: robot3Id,
        hourly_rate: 175.00,
        currency: 'QAR',
        customer_latitude: 25.3687,
        customer_longitude: 51.5510,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Invoices
    await queryInterface.bulkInsert('invoices', [
      {
        id: uuidv4(),
        invoice_number: 'INV-202403-0001',
        customer_id: customer1Id,
        contract_id: contract1Id,
        amount: 3000.00,
        tax_amount: 0,
        total_amount: 3000.00,
        currency: 'QAR',
        status: 'paid',
        issue_date: '2024-03-01',
        due_date: '2024-03-31',
        paid_date: '2024-03-15',
        payment_method: 'bank_transfer',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        invoice_number: 'INV-202403-0002',
        customer_id: customer2Id,
        contract_id: contract2Id,
        amount: 10000.00,
        tax_amount: 0,
        total_amount: 10000.00,
        currency: 'QAR',
        status: 'pending',
        issue_date: '2024-03-01',
        due_date: '2024-03-31',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        invoice_number: 'INV-202402-0003',
        customer_id: customer3Id,
        amount: 2500.00,
        tax_amount: 0,
        total_amount: 2500.00,
        currency: 'QAR',
        status: 'overdue',
        issue_date: '2024-02-01',
        due_date: '2024-02-28',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Settings
    await queryInterface.bulkInsert('settings', [
      { id: uuidv4(), key: 'arrival_radius_meters', value: '100', description: 'Radius in meters to detect arrival at customer location', updated_at: new Date() },
      { id: uuidv4(), key: 'location_update_interval_seconds', value: '30', description: 'How often to send location updates', updated_at: new Date() },
      { id: uuidv4(), key: 'late_arrival_threshold_minutes', value: '15', description: 'Minutes after scheduled time to flag as late', updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('settings', null, {});
    await queryInterface.bulkDelete('invoices', null, {});
    await queryInterface.bulkDelete('jobs', null, {});
    await queryInterface.bulkDelete('contracts', null, {});
    await queryInterface.bulkDelete('robots', null, {});
    await queryInterface.bulkDelete('vehicles', null, {});
    await queryInterface.bulkDelete('customers', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
