import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/job_provider.dart';
import '../config/theme.dart';
import '../models/job.dart';
import '../widgets/ivd_button.dart';
import '../widgets/job_info_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<JobProvider>().fetchTodayJobs();
    });
  }

  void _startDriving(Job job) async {
    final jobProvider = context.read<JobProvider>();
    await jobProvider.startDriving(job.id);
    if (mounted) {
      Navigator.of(context).pushNamed('/driving');
    }
  }

  void _skipJob(Job job) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: IvdTheme.surfaceDark,
        title: const Text('Skip Job?', style: TextStyle(fontSize: 22)),
        content: Text(
          'Skip ${job.customer.name}?',
          style: const TextStyle(fontSize: 18),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('CANCEL', style: TextStyle(fontSize: 18)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text(
              'SKIP',
              style: TextStyle(fontSize: 18, color: IvdTheme.warningOrange),
            ),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      context.read<JobProvider>().skipJob(job.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final jobProvider = context.watch<JobProvider>();
    final user = authProvider.user;
    final currentJob = jobProvider.currentJob;
    final upcoming = jobProvider.upcomingJobs
        .where((j) => j.id != currentJob?.id)
        .take(3)
        .toList();

    return Scaffold(
      body: Column(
        children: [
          // Top bar
          Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: 24),
            color: IvdTheme.surfaceDark,
            child: Row(
              children: [
                const Icon(Icons.precision_manufacturing,
                    color: IvdTheme.primaryBlue, size: 28),
                const SizedBox(width: 12),
                const Text(
                  'COBOT SERVICES',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: IvdTheme.textPrimary,
                    letterSpacing: 1.5,
                  ),
                ),
                const Spacer(),
                const Icon(Icons.person,
                    color: IvdTheme.textSecondary, size: 20),
                const SizedBox(width: 8),
                Text(
                  user?.fullName ?? '',
                  style: const TextStyle(
                      fontSize: 16, color: IvdTheme.textSecondary),
                ),
                const SizedBox(width: 16),
                IconButton(
                  icon: const Icon(Icons.logout, color: IvdTheme.textSecondary),
                  onPressed: () async {
                    await authProvider.logout();
                    if (mounted) {
                      Navigator.of(context).pushReplacementNamed('/login');
                    }
                  },
                  tooltip: 'Logout',
                ),
              ],
            ),
          ),
          // Main content
          Expanded(
            child: jobProvider.isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: IvdTheme.primaryBlue))
                : Row(
                    children: [
                      // Left panel: Shift overview
                      Container(
                        width: 320,
                        padding: const EdgeInsets.all(20),
                        color: IvdTheme.surfaceDark.withValues(alpha: 0.5),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'SHIFT OVERVIEW',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: IvdTheme.accentBlue,
                                letterSpacing: 1,
                              ),
                            ),
                            const SizedBox(height: 20),
                            _buildStatRow(
                              Icons.check_circle,
                              'Completed',
                              '${jobProvider.completedCount}',
                              IvdTheme.successGreen,
                            ),
                            const SizedBox(height: 12),
                            _buildStatRow(
                              Icons.pending,
                              'Remaining',
                              '${jobProvider.remainingCount}',
                              IvdTheme.warningOrange,
                            ),
                            const SizedBox(height: 12),
                            _buildStatRow(
                              Icons.list_alt,
                              'Total',
                              '${jobProvider.jobs.length}',
                              IvdTheme.textSecondary,
                            ),
                            const SizedBox(height: 24),
                            const Divider(color: IvdTheme.cardDark, thickness: 2),
                            const SizedBox(height: 16),
                            // Current time
                            Row(
                              children: [
                                const Icon(Icons.access_time,
                                    color: IvdTheme.textSecondary, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  DateFormat('HH:mm').format(DateTime.now()),
                                  style: const TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.bold,
                                    color: IvdTheme.textPrimary,
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            // Job list summary
                            ...jobProvider.jobs.take(6).map((job) => Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: Row(
                                    children: [
                                      Icon(
                                        _statusIcon(job.status),
                                        color: _statusColor(job.status),
                                        size: 16,
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        DateFormat('HH:mm')
                                            .format(job.scheduledDateTime),
                                        style: const TextStyle(
                                          fontSize: 14,
                                          color: IvdTheme.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          job.customer.name,
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: job.status ==
                                                    JobStatus.completed
                                                ? IvdTheme.textSecondary
                                                : IvdTheme.textPrimary,
                                            decoration: job.status ==
                                                    JobStatus.completed
                                                ? TextDecoration.lineThrough
                                                : null,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                    ],
                                  ),
                                )),
                          ],
                        ),
                      ),
                      // Right panel: Current/Next job
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: currentJob != null
                              ? Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'CURRENT JOB',
                                      style: TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: IvdTheme.accentBlue,
                                        letterSpacing: 1,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    JobInfoCard(job: currentJob),
                                    const Spacer(),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: IvdButton(
                                            label: 'START DRIVING',
                                            icon: Icons.navigation,
                                            onPressed: () =>
                                                _startDriving(currentJob),
                                            backgroundColor:
                                                IvdTheme.successGreen,
                                            minHeight: 64,
                                            fontSize: 20,
                                            expanded: true,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: IvdButton(
                                            label: 'SKIP JOB',
                                            icon: Icons.skip_next,
                                            onPressed: () =>
                                                _skipJob(currentJob),
                                            backgroundColor:
                                                IvdTheme.warningOrange,
                                            minHeight: 64,
                                            fontSize: 20,
                                            expanded: true,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                )
                              : const Center(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.check_circle_outline,
                                          size: 80, color: IvdTheme.successGreen),
                                      SizedBox(height: 16),
                                      Text(
                                        'All jobs completed!',
                                        style: TextStyle(
                                          fontSize: 24,
                                          color: IvdTheme.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
          ),
          // Bottom bar: Upcoming jobs
          if (upcoming.isNotEmpty)
            Container(
              height: 52,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              color: IvdTheme.surfaceDark,
              child: Row(
                children: [
                  const Icon(Icons.upcoming, color: IvdTheme.textSecondary, size: 18),
                  const SizedBox(width: 12),
                  const Text(
                    'Upcoming:',
                    style: TextStyle(
                      fontSize: 14,
                      color: IvdTheme.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(width: 16),
                  ...upcoming.map((job) => Padding(
                        padding: const EdgeInsets.only(right: 16),
                        child: JobInfoCard(job: job, isCompact: true),
                      )),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatRow(
      IconData icon, String label, String value, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            fontSize: 16,
            color: IvdTheme.textSecondary,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  IconData _statusIcon(JobStatus status) {
    switch (status) {
      case JobStatus.completed:
        return Icons.check_circle;
      case JobStatus.enRoute:
        return Icons.navigation;
      case JobStatus.arrived:
        return Icons.location_on;
      case JobStatus.inProgress:
        return Icons.engineering;
      case JobStatus.cancelled:
      case JobStatus.failed:
        return Icons.skip_next;
      case JobStatus.scheduled:
      case JobStatus.assigned:
        return Icons.radio_button_unchecked;
    }
  }

  Color _statusColor(JobStatus status) {
    switch (status) {
      case JobStatus.completed:
        return IvdTheme.successGreen;
      case JobStatus.enRoute:
        return IvdTheme.primaryBlue;
      case JobStatus.arrived:
        return IvdTheme.accentBlue;
      case JobStatus.inProgress:
        return IvdTheme.warningOrange;
      case JobStatus.cancelled:
      case JobStatus.failed:
        return IvdTheme.textSecondary;
      case JobStatus.scheduled:
      case JobStatus.assigned:
        return IvdTheme.textSecondary;
    }
  }
}
