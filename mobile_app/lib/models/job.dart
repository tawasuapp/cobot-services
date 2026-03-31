import 'customer.dart';
import 'robot.dart';
import 'vehicle.dart';

class Job {
  final String id;
  final String status;
  final String serviceType;
  final DateTime scheduledAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? notes;
  final String operatorId;
  final Customer? customer;
  final Robot? robot;
  final Vehicle? vehicle;

  Job({
    required this.id,
    required this.status,
    required this.serviceType,
    required this.scheduledAt,
    this.startedAt,
    this.completedAt,
    this.notes,
    required this.operatorId,
    this.customer,
    this.robot,
    this.vehicle,
  });

  factory Job.fromJson(Map<String, dynamic> json) {
    return Job(
      id: json['id'] as String,
      status: json['status'] as String,
      serviceType: json['service_type'] as String,
      scheduledAt: DateTime.parse(json['scheduled_at'] as String),
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      notes: json['notes'] as String?,
      operatorId: json['operator_id'] as String,
      customer: json['customer'] != null
          ? Customer.fromJson(json['customer'] as Map<String, dynamic>)
          : null,
      robot: json['robot'] != null
          ? Robot.fromJson(json['robot'] as Map<String, dynamic>)
          : null,
      vehicle: json['vehicle'] != null
          ? Vehicle.fromJson(json['vehicle'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'status': status,
      'service_type': serviceType,
      'scheduled_at': scheduledAt.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'notes': notes,
      'operator_id': operatorId,
      'customer': customer?.toJson(),
      'robot': robot?.toJson(),
      'vehicle': vehicle?.toJson(),
    };
  }

  Job copyWith({
    String? status,
    DateTime? startedAt,
    DateTime? completedAt,
    String? notes,
  }) {
    return Job(
      id: id,
      status: status ?? this.status,
      serviceType: serviceType,
      scheduledAt: scheduledAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      notes: notes ?? this.notes,
      operatorId: operatorId,
      customer: customer,
      robot: robot,
      vehicle: vehicle,
    );
  }
}
