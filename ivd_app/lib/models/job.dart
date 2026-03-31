import 'customer.dart';

enum JobStatus {
  pending,
  driving,
  arrived,
  inProgress,
  completed,
  skipped,
}

JobStatus jobStatusFromString(String status) {
  switch (status) {
    case 'pending':
      return JobStatus.pending;
    case 'driving':
      return JobStatus.driving;
    case 'arrived':
      return JobStatus.arrived;
    case 'in_progress':
      return JobStatus.inProgress;
    case 'completed':
      return JobStatus.completed;
    case 'skipped':
      return JobStatus.skipped;
    default:
      return JobStatus.pending;
  }
}

String jobStatusToString(JobStatus status) {
  switch (status) {
    case JobStatus.pending:
      return 'pending';
    case JobStatus.driving:
      return 'driving';
    case JobStatus.arrived:
      return 'arrived';
    case JobStatus.inProgress:
      return 'in_progress';
    case JobStatus.completed:
      return 'completed';
    case JobStatus.skipped:
      return 'skipped';
  }
}

class Job {
  final String id;
  final Customer customer;
  final DateTime scheduledTime;
  final String? estimatedDuration;
  final JobStatus status;
  final String? notes;

  Job({
    required this.id,
    required this.customer,
    required this.scheduledTime,
    this.estimatedDuration,
    required this.status,
    this.notes,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      customer: Customer.fromJson(json['customer'] as Map<String, dynamic>),
      scheduledTime: DateTime.parse(json['scheduled_time'] as String),
      estimatedDuration: json['estimated_duration'] as String?,
      status: jobStatusFromString(json['status'] as String),
      notes: json['notes'] as String?,
    );
  }

  Job copyWith({JobStatus? status}) {
    return Job(
      id: id,
      customer: customer,
      scheduledTime: scheduledTime,
      estimatedDuration: estimatedDuration,
      status: status ?? this.status,
      notes: notes,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'customer': customer.toJson(),
        'scheduled_time': scheduledTime.toIso8601String(),
        'estimated_duration': estimatedDuration,
        'status': jobStatusToString(status),
        'notes': notes,
      };
}
