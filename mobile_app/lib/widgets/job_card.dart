import 'package:flutter/material.dart';

import '../models/job.dart';
import 'status_badge.dart';

class JobCard extends StatelessWidget {
  final Job job;
  final VoidCallback? onTap;

  const JobCard({super.key, required this.job, this.onTap});

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
