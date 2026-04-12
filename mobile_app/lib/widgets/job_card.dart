import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/job.dart';
import 'status_badge.dart';

class JobCard extends StatelessWidget {
  final Job job;
  final VoidCallback? onTap;

  const JobCard({super.key, required this.job, this.onTap});

  bool get _isFuture {
    final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
    return job.scheduledDate.compareTo(today) > 0;
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      job.customer?.name ?? 'Unknown Customer',
                      style: Theme.of(context).textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (_isFuture) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      margin: const EdgeInsets.only(right: 6),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'Scheduled',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                      ),
                    ),
                  ],
                  StatusBadge(status: job.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.cleaning_services, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    job.serviceType,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.schedule, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Text(
                    '${job.scheduledDate} at ${job.formattedTime}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
              if (job.customer?.address != null && job.customer!.address.isNotEmpty) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.location_on, size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        job.customer!.address,
                        style: Theme.of(context).textTheme.bodyMedium,
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    ),
                  ],
                ),
              ],
              if (job.robot != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.smart_toy, size: 16, color: Colors.grey),
                    const SizedBox(width: 6),
                    Text(
                      '${job.robot!.name} (${job.robot!.serialNumber})',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
