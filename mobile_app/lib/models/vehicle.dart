class Vehicle {
  final String id;
  final String licensePlate;
  final String make;
  final String model;
  final int? year;
  final String? vin;

  Vehicle({
    required this.id,
    required this.licensePlate,
    required this.make,
    required this.model,
    this.year,
    this.vin,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] as String,
      licensePlate: json['license_plate'] as String,
      make: json['make'] as String,
      model: json['model'] as String,
      year: json['year'] as int?,
      vin: json['vin'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'license_plate': licensePlate,
      'make': make,
      'model': model,
      'year': year,
      'vin': vin,
    };
  }
}
