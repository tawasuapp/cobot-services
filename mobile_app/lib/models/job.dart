import 'package:intl/intl.dart';

import 'customer.dart';
import 'robot.dart';
import 'vehicle.dart';

class Job {
  final String id;
  final String? jobNumber;
  final String status;
  final String serviceType;
  final String? description;
  final String scheduledDate; // "2026-04-03"
  final String scheduledTime; // "09:00:00"
  final int? estimatedDurationMinutes;
  final String? priority;
  final String? notes;
  final String operatorId;
  final String? customerId;
  final String? hourlyRate;
  final String? currency;
  final bool? isRecurring;
  final double? customerLatitude;
  final double? customerLongitude;
  final DateTime? startTime;
  final DateTime? completionTime;
  final Customer? customer;
  final Robot? robot;
  final Vehicle? vehicle;

  Job({
    required this.id,
    this.jobNumber,
    required this.status,
    required this.serviceType,
    this.description,
    required this.scheduledDate,
    required this.scheduledTime,
    this.estimatedDurationMinutes,
    this.priority,
    this.notes,
    required this.operatorId,
    this.customerId,
    this.hourlyRate,
    this.currency,
    this.isRecurring,
    this.customerLatitude,
    this.customerLongitude,
    this.startTime,
    this.completionTime,
    this.customer,
    this.robot,
    this.vehicle,
  });

  /// Parse scheduled_date + scheduled_time into a DateTime.
  DateTime get scheduledDateTime {
    try {
      return DateTime.parse('$scheduledDate $scheduledTime');
    } catch (_) {
      try {
        return DateTime.parse(scheduledDate);
      } catch (_) {
        return DateTime.now();
      }
    }
  }

  /// Formatted time for display, e.g. "9:00 AM".
  String get formattedTime {
    try {
      final dt = scheduledDateTime;
      return DateFormat('h:mm a').format(dt);
    } catch (_) {
      return scheduledTime;
    }
  }

  factory Job.fromJson(Map<String, dynamic> json) {
    // Customer can be nested as 'Customer' or 'customer'
    final customerData = json['Customer'] ?? json['customer'];
    // Operator nested data (not used as model, just for ID fallback)
    final operatorData = json['operator'];

    return Job(
      id: json['id'] as String? ?? '',
      jobNumber: json['job_number'] as String?,
      status: json['status'] as String? ?? 'scheduled',
      serviceType: json['service_type'] as String? ?? '',
      description: json['description'] as String?,
      scheduledDate: json['scheduled_date'] as String? ?? '',
      scheduledTime: json['scheduled_time'] as String? ?? '00:00:00',
      estimatedDurationMinutes: json['estimated_duration_minutes'] as int?,
      priority: json['priority'] as String?,
      notes: json['notes'] as String?,
      operatorId: json['assigned_operator_id'] as String? ??
          (operatorData is Map ? operatorData['id'] as String? : null) ??
          '',
      customerId: json['customer_id'] as String?,
      hourlyRate: json['hourly_rate']?.toString(),
      currency: json['currency'] as String?,
      isRecurring: json['is_recurring'] as bool?,
      customerLatitude: _parseDouble(json['customer_latitude']),
      customerLongitude: _parseDouble(json['customer_longitude']),
      startTime: json['start_time'] != null
          ? DateTime.tryParse(json['start_time'] as String)
          : null,
      completionTime: json['completion_time'] != null
          ? DateTime.tryParse(json['completion_time'] as String)
          : null,
      customer: customerData != null
          ? Customer.fromJson(customerData as Map<String, dynamic>)
          : null,
      robot: json['robot'] != null
          ? Robot.fromJson(json['robot'] as Map<String, dynamic>)
          : null,
      vehicle: json['vehicle'] != null
          ? Vehicle.fromJson(json['vehicle'] as Map<String, dynamic>)
          : null,
    );
  }

  static double? _parseDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'job_number': jobNumber,
      'status': status,
      'service_type': serviceType,
      'description': description,
      'scheduled_date': scheduledDate,
      'scheduled_time': scheduledTime,
      'estimated_duration_minutes': estimatedDurationMinutes,
      'priority': priority,
      'notes': notes,
      'assigned_operator_id': operatorId,
      'customer_id': customerId,
      'hourly_rate': hourlyRate,
      'currency': currency,
      'is_recurring': isRecurring,
      'customer_latitude': customerLatitude,
      'customer_longitude': customerLongitude,
      'start_time': startTime?.toIso8601String(),
      'completion_time': completionTime?.toIso8601String(),
      'customer': customer?.toJson(),
      'robot': robot?.toJson(),
      'vehicle': vehicle?.toJson(),
    };
  }

  Job copyWith({
    String? status,
    DateTime? startTime,
    DateTime? completionTime,
    String? notes,
  }) {
    return Job(
      id: id,
      jobNumber: jobNumber,
      status: status ?? this.status,
      serviceType: serviceType,
      description: description,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      estimatedDurationMinutes: estimatedDurationMinutes,
      priority: priority,
      notes: notes ?? this.notes,
      operatorId: operatorId,
      customerId: customerId,
      hourlyRate: hourlyRate,
      currency: currency,
      isRecurring: isRecurring,
      customerLatitude: customerLatitude,
      customerLongitude: customerLongitude,
      startTime: startTime ?? this.startTime,
      completionTime: completionTime ?? this.completionTime,
      customer: customer,
      robot: robot,
      vehicle: vehicle,
    );
  }
}
