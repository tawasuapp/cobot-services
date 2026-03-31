import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/job.dart';
import '../config/theme.dart';

class JobInfoCard extends StatelessWidget {
  final Job job;
  final bool isCompact;

  const JobInfoCard({
    super.key,
    required this.job,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isCompact) {
      return _buildCompact(context);
    }
    return _buildFull(context);
  }

  Widget _buildCompact(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: IvdTheme.cardDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.schedule,
            color: IvdTheme.textSecondary,
            size: 18,
          ),
          const SizedBox(width: 8),
          Text(
            timeFormat.format(job.scheduledTime),
            style: const TextStyle(
              color: IvdTheme.textSecondary,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              job.customer.name,
              style: const TextStyle(
                color: IvdTheme.textPrimary,
                fontSize: 16,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFull(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: IvdTheme.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: IvdTheme.primaryBlue.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            job.customer.name,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: IvdTheme.textPrimary,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.location_on, color: IvdTheme.accentBlue, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  job.customer.address,
                  style: const TextStyle(
                    fontSize: 18,
                    color: IvdTheme.textSecondary,
                  ),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.schedule, color: IvdTheme.accentBlue, size: 20),
              const SizedBox(width: 8),
              Text(
                'Scheduled: ${DateFormat('HH:mm').format(job.scheduledTime)}',
                style: const TextStyle(
                  fontSize: 18,
                  color: IvdTheme.textSecondary,
                ),
              ),
              if (job.estimatedDuration != null) ...[
                const SizedBox(width: 16),
                const Icon(Icons.timer, color: IvdTheme.accentBlue, size: 20),
                const SizedBox(width: 8),
                Text(
                  job.estimatedDuration!,
                  style: const TextStyle(
                    fontSize: 18,
                    color: IvdTheme.textSecondary,
                  ),
                ),
              ],
            ],
          ),
          if (job.notes != null && job.notes!.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.notes, color: IvdTheme.warningOrange, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    job.notes!,
                    style: const TextStyle(
                      fontSize: 16,
                      color: IvdTheme.warningOrange,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
