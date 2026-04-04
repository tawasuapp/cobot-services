class Customer {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String? phone;

  Customer({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.phone,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      name: (json['company_name'] ?? json['name'] ?? '') as String,
      address: (json['address'] ?? '') as String,
      latitude: _toDouble(json['latitude']),
      longitude: _toDouble(json['longitude']),
      phone: json['phone'] as String?,
    );
  }

  static double _toDouble(dynamic v) {
    if (v == null) return 0.0;
    if (v is double) return v;
    if (v is int) return v.toDouble();
    if (v is String) return double.tryParse(v) ?? 0.0;
    return 0.0;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'company_name': name,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
      };
}
