const { JobReport, Job, User } = require('../models');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');

const reportIncludes = [
  { model: Job, attributes: ['id', 'job_number', 'service_type', 'scheduled_date'] },
  { model: User, as: 'uploader', attributes: ['id', 'first_name', 'last_name'] },
];

async function listReports(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.report_type) where.report_type = req.query.report_type;
    if (req.query.job_id) where.job_id = req.query.job_id;

    const { rows, count } = await JobReport.findAndCountAll({
      where,
      include: reportIncludes,
      order: [['uploaded_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getReport(req, res, next) {
  try {
    const report = await JobReport.findByPk(req.params.id, { include: reportIncludes });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    next(error);
  }
}

async function createReport(req, res, next) {
  try {
    const data = {
      job_id: req.body.job_id,
      uploaded_by: req.user.id,
      report_type: req.body.report_type || 'cleaning_report',
      file_url: req.body.file_url,
      file_type: req.body.file_type,
      description: req.body.description,
    };

    const report = await JobReport.create(data);
    const fullReport = await JobReport.findByPk(report.id, { include: reportIncludes });

    res.status(201).json(fullReport);
  } catch (error) {
    next(error);
  }
}

async function deleteReport(req, res, next) {
  try {
    const report = await JobReport.findByPk(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await report.destroy();
    res.json({ message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
}

async function getReportsByJob(req, res, next) {
  try {
    const reports = await JobReport.findAll({
      where: { job_id: req.params.jobId },
      include: reportIncludes,
      order: [['uploaded_at', 'DESC']],
    });
    res.json(reports);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listReports, getReport, createReport, deleteReport, getReportsByJob,
};
