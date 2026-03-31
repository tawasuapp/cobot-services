import 'package:flutter/material.dart';
import '../models/job.dart';
import '../services/api_service.dart';
import '../config/api_config.dart';

class JobProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Job> _jobs = [];
  Job? _currentJob;
  bool _isLoading = false;
  String? _errorMessage;

  List<Job> get jobs => _jobs;
  Job? get currentJob => _currentJob;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get completedCount =>
      _jobs.where((j) => j.status == JobStatus.completed).length;

  int get remainingCount => _jobs
      .where((j) =>
          j.status == JobStatus.pending || j.status == JobStatus.driving)
      .length;

  List<Job> get upcomingJobs => _jobs
      .where((j) => j.status == JobStatus.pending)
      .toList()
    ..sort((a, b) => a.scheduledTime.compareTo(b.scheduledTime));

  Future<void> fetchTodayJobs() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiService.get(
        ApiConfig.jobs,
        queryParameters: {
          'date': DateTime.now().toIso8601String().substring(0, 10),
        },
      );

      final List<dynamic> jobsData = response.data['jobs'] as List<dynamic>;
      _jobs = jobsData
          .map((j) => Job.fromJson(j as Map<String, dynamic>))
          .toList();
      _jobs.sort((a, b) => a.scheduledTime.compareTo(b.scheduledTime));

      // Set current job to the first non-completed, non-skipped job
      _currentJob = _jobs.cast<Job?>().firstWhere(
            (j) =>
                j!.status == JobStatus.pending ||
                j.status == JobStatus.driving ||
                j.status == JobStatus.arrived,
            orElse: () => null,
          );

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to load jobs.';
      notifyListeners();
    }
  }

  Future<void> updateJobStatus(String jobId, JobStatus status) async {
    try {
      await _apiService.patch(
        ApiConfig.jobStatusUrl(jobId),
        data: {'status': jobStatusToString(status)},
      );

      final index = _jobs.indexWhere((j) => j.id == jobId);
      if (index != -1) {
        _jobs[index] = _jobs[index].copyWith(status: status);
      }

      if (_currentJob?.id == jobId) {
        _currentJob = _currentJob!.copyWith(status: status);
      }

      // If completed or skipped, advance to next job
      if (status == JobStatus.completed || status == JobStatus.skipped) {
        _currentJob = _jobs.cast<Job?>().firstWhere(
              (j) => j!.status == JobStatus.pending,
              orElse: () => null,
            );
      }

      notifyListeners();
    } catch (e) {
      _errorMessage = 'Failed to update job status.';
      notifyListeners();
    }
  }

  Future<void> startDriving(String jobId) async {
    await updateJobStatus(jobId, JobStatus.driving);
  }

  Future<void> markArrived(String jobId) async {
    await updateJobStatus(jobId, JobStatus.arrived);
  }

  Future<void> skipJob(String jobId) async {
    await updateJobStatus(jobId, JobStatus.skipped);
  }

  Future<void> completeJob(String jobId) async {
    await updateJobStatus(jobId, JobStatus.completed);
  }
}
