import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final config = _statusConfig(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        config.label,
        style: TextStyle(
          color: config.color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  static _StatusConfig _statusConfig(String status) {
    switch (status) {
      case 'scheduled':
      case 'assigned':
        return _StatusConfig('Scheduled', Colors.blue);
      case 'en_route':
        return _StatusConfig('En Route', Colors.indigo);
      case 'arrived':
        return _StatusConfig('Arrived', Colors.purple);
      case 'in_progress':
        return _StatusConfig('In Progress', Colors.orange);
      case 'completed':
        return _StatusConfig('Completed', Colors.green);
      case 'cancelled':
        return _StatusConfig('Cancelled', Colors.red);
      default:
        return _StatusConfig(status, Colors.grey);
    }
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  _StatusConfig(this.label, this.color);
}
