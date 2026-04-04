import 'customer.dart';

enum JobStatus {
  scheduled,
  assigned,
  enRoute,
  arrived,
  inProgress,
  completed,
  cancelled,
  failed,
}

JobStatus jobStatusFromString(String status) {
  switch (status) {
    case 'scheduled':
      return JobStatus.scheduled;
    case 'assigned':
      return JobStatus.assigned;
    case 'en_route':
      return JobStatus.enRoute;
    case 'arrived':
      return JobStatus.arrived;
    case 'in_progress':
      return JobStatus.inProgress;
    case 'completed':
      return JobStatus.completed;
    case 'cancelled':
      return JobStatus.cancelled;
    case 'failed':
      return JobStatus.failed;
    default:
      return JobStatus.scheduled;
  }
}

String jobStatusToString(JobStatus status) {
  switch (status) {
    case JobStatus.scheduled:
      return 'scheduled';
    case JobStatus.assigned:
      return 'assigned';
    case JobStatus.enRoute:
      return 'en_route';
    case JobStatus.arrived:
      return 'arrived';
    case JobStatus.inProgress:
      return 'in_progress';
    case JobStatus.completed:
      return 'completed';
    case JobStatus.cancelled:
      return 'cancelled';
    case JobStatus.failed:
      return 'failed';
  }
}

class Job {
  final String id;
  final String jobNumber;
  final Customer customer;
  final String serviceType;
  final String? description;
  final String scheduledDate;
  final String scheduledTime;
  final int? estimatedDurationMinutes;
  final JobStatus status;
  final String priority;
  final String? notes;

  Job({
    required this.id,
    required this.jobNumber,
    required this.customer,
    required this.serviceType,
    this.description,
    required this.scheduledDate,
    required this.scheduledTime,
    this.estimatedDurationMinutes,
    required this.status,
    this.priority = 'normal',
    this.notes,
  });

  /// Parse scheduled_date + scheduled_time into a DateTime
  DateTime get scheduledDateTime {
    try {
      return DateTime.parse('${scheduledDate}T$scheduledTime');
    } catch (_) {
      return DateTime.now();
    }
  }

  /// Formatted time like "09:00 AM"
  String get formattedTime {
    final parts = scheduledTime.split(':');
    if (parts.length < 2) return scheduledTime;
    final hour = int.tryParse(parts[0]) ?? 0;
    final min = parts[1];
    final ampm = hour >= 12 ? 'PM' : 'AM';
    final h12 = hour % 12 == 0 ? 12 : hour % 12;
    return '$h12:$min $ampm';
  }

  factory Job.fromJson(Map<String, dynamic> json) {
    // Customer can be nested as 'Customer' (Sequelize default) or 'customer'
    final customerData = json['Customer'] ?? json['customer'];
    Customer customer;
    if (customerData is Map<String, dynamic>) {
      customer = Customer.fromJson(customerData);
    } else {
      // Fallback: build from job's own fields
      customer = Customer(
        id: json['customer_id'] as String? ?? '',
        name: 'Unknown Customer',
        address: '',
        latitude: (json['customer_latitude'] as num?)?.toDouble() ?? 0,
        longitude: (json['customer_longitude'] as num?)?.toDouble() ?? 0,
      );
    }

    return Job(
      id: json['id'] as String,
      jobNumber: json['job_number'] as String? ?? '',
      customer: customer,
      serviceType: json['service_type'] as String? ?? '',
      description: json['description'] as String?,
      scheduledDate: json['scheduled_date'] as String? ?? '',
      scheduledTime: json['scheduled_time'] as String? ?? '',
      estimatedDurationMinutes: json['estimated_duration_minutes'] as int?,
      status: jobStatusFromString(json['status'] as String? ?? 'scheduled'),
      priority: json['priority'] as String? ?? 'normal',
      notes: json['notes'] as String?,
    );
  }

  Job copyWith({JobStatus? status}) {
    return Job(
      id: id,
      jobNumber: jobNumber,
      customer: customer,
      serviceType: serviceType,
      description: description,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      estimatedDurationMinutes: estimatedDurationMinutes,
      status: status ?? this.status,
      priority: priority,
      notes: notes,
    );
  }
}
