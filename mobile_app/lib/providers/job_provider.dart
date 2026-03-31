import 'package:flutter/foundation.dart';

import '../config/api_config.dart';
import '../models/job.dart';
import '../services/api_service.dart';

class JobProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Job> _todaysJobs = [];
  List<Job> _operatorJobs = [];
  Job? _currentJob;
  bool _isLoading = false;
  String? _error;

  List<Job> get todaysJobs => _todaysJobs;
  List<Job> get operatorJobs => _operatorJobs;
  Job? get currentJob => _currentJob;
  bool get isLoading => _isLoading;
  String? get error => _error;

  List<Job> get scheduledJobs =>
      _operatorJobs.where((j) => j.status == 'assigned' || j.status == 'scheduled').toList();

  List<Job> get completedJobs =>
      _operatorJobs.where((j) => j.status == 'completed').toList();

  List<Job> get activeJobs => _operatorJobs
      .where((j) =>
          j.status == 'en_route' ||
          j.status == 'arrived' ||
          j.status == 'in_progress')
      .toList();

  Job? get nextJob {
    final upcoming = scheduledJobs
      ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    return upcoming.isNotEmpty ? upcoming.first : null;
  }

  Future<void> fetchTodaysJobs() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.get(ApiConfig.todaysJobs);
      final List<dynamic> data = response.data as List<dynamic>;
      _todaysJobs = data
          .map((json) => Job.fromJson(json as Map<String, dynamic>))
          .toList();

      // Set current active job if exists
      final active = _todaysJobs.where((j) =>
          j.status == 'en_route' ||
          j.status == 'arrived' ||
          j.status == 'in_progress');
      _currentJob = active.isNotEmpty ? active.first : null;

      _error = null;
    } catch (e) {
      _error = 'Failed to fetch today\'s jobs';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<void> fetchOperatorJobs() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.get(ApiConfig.operatorJobs);
      final List<dynamic> data = response.data as List<dynamic>;
      _operatorJobs = data
          .map((json) => Job.fromJson(json as Map<String, dynamic>))
          .toList();
      _error = null;
    } catch (e) {
      _error = 'Failed to fetch jobs';
    }

    _isLoading = false;
    notifyListeners();
  }

  Future<bool> updateJobStatus(String jobId, String newStatus) async {
    try {
      await _api.patch(
        '${ApiConfig.jobs}/$jobId/status',
        data: {'status': newStatus},
      );

      // Update local state
      _todaysJobs = _todaysJobs.map((j) {
        if (j.id == jobId) {
          final updated = j.copyWith(status: newStatus);
          if (_currentJob?.id == jobId) _currentJob = updated;
          return updated;
        }
        return j;
      }).toList();

      _operatorJobs = _operatorJobs.map((j) {
        if (j.id == jobId) return j.copyWith(status: newStatus);
        return j;
      }).toList();

      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Failed to update job status';
      notifyListeners();
      return false;
    }
  }

  void setCurrentJob(Job job) {
    _currentJob = job;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
