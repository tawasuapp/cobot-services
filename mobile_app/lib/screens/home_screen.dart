import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/job_provider.dart';
import '../providers/location_provider.dart';
import '../utils/helpers.dart';
import '../widgets/job_card.dart';
import '../widgets/status_badge.dart';

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
      context.read<JobProvider>().fetchTodaysJobs();
      context.read<JobProvider>().fetchOperatorJobs();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final jobs = context.watch<JobProvider>();
    final location = context.watch<LocationProvider>();
    final user = auth.currentUser;
    final theme = Theme.of(context);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await jobs.fetchTodaysJobs();
          await jobs.fetchOperatorJobs();
        },
        child: CustomScrollView(
          slivers: [
            // App bar with greeting
            SliverAppBar(
              expandedHeight: 140,
              pinned: true,
              flexibleSpace: LayoutBuilder(
                builder: (context, constraints) {
                  final isCollapsed = constraints.maxHeight <= kToolbarHeight + MediaQuery.of(context).padding.top + 10;
                  return FlexibleSpaceBar(
                    centerTitle: true,
                    title: isCollapsed
                        ? const Text('Cobot Operator', style: TextStyle(fontSize: 18, color: Colors.white))
                        : null,
                    collapseMode: CollapseMode.parallax,
                    background: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [theme.primaryColor, theme.primaryColor.withValues(alpha: 0.8)],
                        ),
                      ),
                      child: SafeArea(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(20, 10, 20, 0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: Colors.white24,
                                    child: Text(
                                      user?.firstName.isNotEmpty == true ? user!.firstName[0] : '',
                                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('Hello, ${user?.firstName ?? 'Operator'}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                                        Text(Helpers.formatDate(DateTime.now()), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: location.isTracking ? Colors.green.withValues(alpha: 0.3) : Colors.red.withValues(alpha: 0.3),
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(location.isTracking ? Icons.gps_fixed : Icons.gps_off, color: Colors.white, size: 14),
                                        const SizedBox(width: 4),
                                        Text(location.isTracking ? 'GPS On' : 'GPS Off', style: const TextStyle(color: Colors.white, fontSize: 11)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  );
                },
              )
            ),

            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // KPI Row
                  Row(
                    children: [
                      _KpiTile(
                        icon: Icons.today,
                        label: "Today's Jobs",
                        value: '${jobs.todaysJobs.length}',
                        color: Colors.blue,
                      ),
                      const SizedBox(width: 10),
                      _KpiTile(
                        icon: Icons.play_circle,
                        label: 'Active',
                        value: '${jobs.activeJobs.length}',
                        color: Colors.orange,
                      ),
                      const SizedBox(width: 10),
                      _KpiTile(
                        icon: Icons.check_circle,
                        label: 'Completed',
                        value: '${jobs.completedJobs.length}',
                        color: Colors.green,
                      ),
                      const SizedBox(width: 10),
                      _KpiTile(
                        icon: Icons.pending_actions,
                        label: 'Pending',
                        value: '${jobs.scheduledJobs.length}',
                        color: Colors.purple,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Active Job Card (if exists)
                  if (jobs.currentJob != null) ...[
                    _SectionHeader(title: 'Active Job', trailing: StatusBadge(status: jobs.currentJob!.status)),
                    const SizedBox(height: 8),
                    _ActiveJobCard(
                      job: jobs.currentJob!,
                      onTap: () => Navigator.of(context).pushNamed('/job-detail', arguments: jobs.currentJob),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Next Job
                  if (jobs.nextJob != null && jobs.currentJob == null) ...[
                    const _SectionHeader(title: 'Next Job'),
                    const SizedBox(height: 8),
                    _NextJobCard(
                      job: jobs.nextJob!,
                      onTap: () => Navigator.of(context).pushNamed('/job-detail', arguments: jobs.nextJob),
                    ),
                    const SizedBox(height: 20),
                  ],

                  // Today's Schedule
                  _SectionHeader(
                    title: "Today's Schedule",
                    trailing: TextButton(
                      onPressed: () {}, // Jobs tab is accessible via bottom nav
                      child: const Text('See All'),
                    ),
                  ),
                  const SizedBox(height: 8),

                  if (jobs.isLoading)
                    const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())),

                  if (!jobs.isLoading && jobs.todaysJobs.isEmpty)
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          children: [
                            Icon(Icons.event_available, size: 48, color: Colors.grey.shade300),
                            const SizedBox(height: 12),
                            const Text('No jobs scheduled for today', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                      ),
                    ),

                  ...jobs.todaysJobs.map((job) => Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: JobCard(
                      job: job,
                      onTap: () => Navigator.of(context).pushNamed('/job-detail', arguments: job),
                    ),
                  )),

                  const SizedBox(height: 80), // space for bottom nav
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KpiTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _KpiTile({required this.icon, required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10, color: color.withValues(alpha: 0.8)), textAlign: TextAlign.center, maxLines: 1),
          ],
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final Widget? trailing;
  const _SectionHeader({required this.title, this.trailing});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        if (trailing != null) trailing!,
      ],
    );
  }
}

class _ActiveJobCard extends StatelessWidget {
  final dynamic job;
  final VoidCallback onTap;
  const _ActiveJobCard({required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.orange.shade200, width: 1.5),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(8)),
                    child: Icon(Icons.play_circle_fill, color: Colors.orange.shade700, size: 28),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(job.customer?.name ?? 'Customer', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                        Text(job.serviceType, style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.grey),
                ],
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  _InfoChip(Icons.schedule, job.formattedTime),
                  if (job.robot != null) _InfoChip(Icons.smart_toy, job.robot.name ?? ''),
                  if (job.vehicle != null) _InfoChip(Icons.local_shipping, job.vehicle.plateNumber ?? ''),
                ],
              ),
              if (job.customer?.address != null && job.customer.address.isNotEmpty) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.location_on, size: 14, color: Colors.grey.shade500),
                    const SizedBox(width: 4),
                    Expanded(child: Text(job.customer.address, style: const TextStyle(fontSize: 12, color: Colors.grey), maxLines: 1, overflow: TextOverflow.ellipsis)),
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

class _NextJobCard extends StatelessWidget {
  final dynamic job;
  final VoidCallback onTap;
  const _NextJobCard({required this.job, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.blue.shade100),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(10)),
                child: Icon(Icons.upcoming, color: Colors.blue.shade700, size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(job.customer?.name ?? 'Customer', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 2),
                    Text('${job.serviceType} • ${job.formattedTime}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip(this.icon, this.label);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade100,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: Colors.grey.shade700),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade700)),
        ],
      ),
    );
  }
}
