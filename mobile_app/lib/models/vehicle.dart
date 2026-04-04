class Vehicle {
  final String id;
  final String plateNumber;
  final String name;
  final String? status;

  Vehicle({
    required this.id,
    required this.plateNumber,
    required this.name,
    this.status,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] as String? ?? '',
      plateNumber: json['plate_number'] as String? ?? '',
      name: json['name'] as String? ?? '',
      status: json['status'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'plate_number': plateNumber,
      'name': name,
      'status': status,
    };
  }
}
