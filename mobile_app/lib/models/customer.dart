class Customer {
  final String id;
  final String name;
  final String address;
  final String? phone;
  final String? email;
  final double? latitude;
  final double? longitude;
  final String? contactPerson;

  Customer({
    required this.id,
    required this.name,
    required this.address,
    this.phone,
    this.email,
    this.latitude,
    this.longitude,
    this.contactPerson,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    // Handle nested Customer/customer key from backend
    final data = json['Customer'] ?? json['customer'] ?? json;

    return Customer(
      id: data['id'] as String? ?? '',
      name: data['company_name'] as String? ?? data['name'] as String? ?? '',
      address: data['address'] as String? ?? '',
      phone: data['phone'] as String?,
      email: data['email'] as String?,
      latitude: _parseDouble(data['latitude']),
      longitude: _parseDouble(data['longitude']),
      contactPerson: data['contact_person'] as String?,
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
      'company_name': name,
      'address': address,
      'phone': phone,
      'email': email,
      'latitude': latitude,
      'longitude': longitude,
      'contact_person': contactPerson,
    };
  }
}
