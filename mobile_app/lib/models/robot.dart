class Robot {
  final String id;
  final String serialNumber;
  final String name;
  final String status;
  final int? batteryLevel;
  final String? firmwareVersion;

  Robot({
    required this.id,
    required this.serialNumber,
    required this.name,
    required this.status,
    this.batteryLevel,
    this.firmwareVersion,
  });

  factory Robot.fromJson(Map<String, dynamic> json) {
    return Robot(
      id: json['id'] as String? ?? '',
      serialNumber: json['serial_number'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String? ?? 'unknown',
      batteryLevel: json['battery_level'] as int?,
      firmwareVersion: json['firmware_version'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'serial_number': serialNumber,
      'name': name,
      'status': status,
      'battery_level': batteryLevel,
      'firmware_version': firmwareVersion,
    };
  }
}
