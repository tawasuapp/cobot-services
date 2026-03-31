import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/job.dart';
import '../providers/job_provider.dart';
import '../widgets/job_card.dart';

class JobListScreen extends StatefulWidget {
  const JobListScreen({super.key});

  @override
  State<JobListScreen> createState() => _JobListScreenState();
}

class _JobListScreenState extends State<JobListScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<JobProvider>().fetchTodaysJobs();
      context.read<JobProvider>().fetchOperatorJobs();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Jobs'),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Today'),
            Tab(text: 'Upcoming'),
            Tab(text: 'Completed'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _JobTab(
            jobSelector: (provider) => provider.todaysJobs,
            onRefresh: () => context.read<JobProvider>().fetchTodaysJobs(),
            emptyMessage: 'No jobs scheduled for today',
          ),
          _JobTab(
            jobSelector: (provider) => provider.scheduledJobs,
            onRefresh: () => context.read<JobProvider>().fetchOperatorJobs(),
            emptyMessage: 'No upcoming jobs',
          ),
          _JobTab(
            jobSelector: (provider) => provider.completedJobs,
            onRefresh: () => context.read<JobProvider>().fetchOperatorJobs(),
            emptyMessage: 'No completed jobs yet',
          ),
        ],
      ),
    );
  }
}

class _JobTab extends StatelessWidget {
  final List<Job> Function(JobProvider provider) jobSelector;
  final Future<void> Function() onRefresh;
  final String emptyMessage;

  const _JobTab({
    required this.jobSelector,
    required this.onRefresh,
    required this.emptyMessage,
  });

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<JobProvider>();
    final jobs = jobSelector(provider);

    if (provider.isLoading && jobs.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (jobs.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox, size: 64, color: Colors.grey),
            const SizedBox(height: 16),
            Text(
              emptyMessage,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: jobs.length,
        itemBuilder: (context, index) {
          final job = jobs[index];
          return JobCard(
            job: job,
            onTap: () {
              Navigator.of(context).pushNamed('/job-detail', arguments: job);
            },
          );
        },
      ),
    );
  }
}
