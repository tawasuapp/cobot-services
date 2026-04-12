import 'package:flutter/material.dart';
import '../models/job.dart';
import '../services/api_service.dart';

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
          j.status != JobStatus.completed &&
          j.status != JobStatus.cancelled &&
          j.status != JobStatus.failed)
      .length;

  List<Job> get upcomingJobs => _jobs
      .where((j) =>
          j.status == JobStatus.scheduled || j.status == JobStatus.assigned)
      .toList()
    ..sort((a, b) => a.scheduledDateTime.compareTo(b.scheduledDateTime));

  Future<void> fetchTodayJobs() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final today = DateTime.now().toIso8601String().substring(0, 10);
      final response = await _apiService.get(
        '/jobs',
        queryParameters: {'date_from': today, 'date_to': today, 'limit': '50'},
      );

      final responseData = response.data;
      List<dynamic> jobsData;

      // Handle both {data: [...]} and direct [...] response formats
      if (responseData is Map && responseData.containsKey('data')) {
        jobsData = responseData['data'] as List<dynamic>;
      } else if (responseData is List) {
        jobsData = responseData;
      } else {
        jobsData = [];
      }

      _jobs = jobsData
          .map((j) => Job.fromJson(j as Map<String, dynamic>))
          .toList();
      _jobs.sort((a, b) => a.scheduledDateTime.compareTo(b.scheduledDateTime));

      // Set current job to the first active/pending job
      _currentJob = _jobs.cast<Job?>().firstWhere(
            (j) =>
                j!.status == JobStatus.scheduled ||
                j.status == JobStatus.assigned ||
                j.status == JobStatus.enRoute ||
                j.status == JobStatus.arrived,
            orElse: () => null,
          );

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to load jobs: $e';
      debugPrint('FETCH JOBS ERROR: $e');
      notifyListeners();
    }
  }

  Future<bool> updateJobStatus(String jobId, JobStatus status) async {
    try {
      await _apiService.put(
        '/jobs/$jobId/status',
        data: {'status': jobStatusToString(status)},
      );

      final index = _jobs.indexWhere((j) => j.id == jobId);
      if (index != -1) {
        _jobs[index] = _jobs[index].copyWith(status: status);
      }

      if (_currentJob?.id == jobId) {
        _currentJob = _currentJob!.copyWith(status: status);
      }

      // If completed or cancelled, advance to next job
      if (status == JobStatus.completed || status == JobStatus.cancelled) {
        _currentJob = _jobs.cast<Job?>().firstWhere(
              (j) =>
                  j!.status == JobStatus.scheduled ||
                  j.status == JobStatus.assigned,
              orElse: () => null,
            );
      }

      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to update job status: $e';
      debugPrint('UPDATE STATUS ERROR: $e');
      notifyListeners();
      return false;
    }
  }

  Future<bool> startDriving(String jobId) =>
      updateJobStatus(jobId, JobStatus.enRoute);

  Future<bool> markArrived(String jobId) =>
      updateJobStatus(jobId, JobStatus.arrived);

  Future<bool> skipJob(String jobId) =>
      updateJobStatus(jobId, JobStatus.cancelled);

  Future<bool> completeJob(String jobId) =>
      updateJobStatus(jobId, JobStatus.completed);
}
