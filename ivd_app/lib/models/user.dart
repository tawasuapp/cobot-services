class User {
  final String id;
  final String email;
  final String name;
  final String? vanName;
  final String role;

  User({
    required this.id,
    required this.email,
    required this.name,
    this.vanName,
    required this.role,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String,
      vanName: json['van_name'] as String?,
      role: json['role'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'name': name,
        'van_name': vanName,
        'role': role,
      };
}
