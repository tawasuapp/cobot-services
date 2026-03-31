const { Customer, Robot, Vehicle, Job, QRScanLog } = require('../models');
const { parseQRCode } = require('../utils/qrGenerator');

async function processScan(req, res, next) {
  try {
    const { qrData, jobId, scanType } = req.body;
    const userId = req.user.id;

    const parsed = parseQRCode(qrData);

    // Validate QR code entity exists
    let entity;
    switch (parsed.type) {
      case 'customer_location':
        entity = await Customer.findByPk(parsed.id);
        break;
      case 'robot':
        entity = await Robot.findByPk(parsed.id);
        break;
      case 'vehicle':
        entity = await Vehicle.findByPk(parsed.id);
        break;
      default:
        return res.status(400).json({ error: 'Unknown QR type' });
    }

    if (!entity) {
      return res.status(404).json({ error: 'Invalid QR code - entity not found' });
    }

    // Log the scan
    await QRScanLog.create({
      scanned_by: userId,
      job_id: jobId,
      qr_type: scanType,
      qr_code: qrData,
      scanned_entity_type: parsed.type,
      scanned_entity_id: parsed.id,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    });

    // Process based on scan type
    switch (scanType) {
      case 'customer_location':
        if (jobId) {
          await Job.update({ status: 'arrived', arrival_time: new Date() }, { where: { id: jobId } });
        }
        break;

      case 'robot_deploy':
        await Robot.update(
          { status: 'deployed', assigned_job_id: jobId },
          { where: { id: parsed.id } }
        );
        if (jobId) {
          await Job.update({ status: 'in_progress', start_time: new Date() }, { where: { id: jobId } });
        }
        break;

      case 'robot_return':
        await Robot.update(
          { status: 'available', assigned_job_id: null },
          { where: { id: parsed.id } }
        );
        break;

      case 'vehicle_return':
        // Confirm robot back in vehicle - final step
        break;
    }

    res.json({ success: true, entity });
  } catch (error) {
    if (error.message === 'Invalid QR code format') {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }
    next(error);
  }
}

async function validateQR(req, res, next) {
  try {
    const parsed = parseQRCode(req.params.code);

    let entity;
    switch (parsed.type) {
      case 'customer_location':
        entity = await Customer.findByPk(parsed.id, { attributes: ['id', 'company_name'] });
        break;
      case 'robot':
        entity = await Robot.findByPk(parsed.id, { attributes: ['id', 'serial_number', 'name'] });
        break;
      case 'vehicle':
        entity = await Vehicle.findByPk(parsed.id, { attributes: ['id', 'plate_number', 'name'] });
        break;
    }

    if (!entity) {
      return res.status(404).json({ valid: false, error: 'Entity not found' });
    }

    res.json({ valid: true, type: parsed.type, entity });
  } catch (error) {
    res.status(400).json({ valid: false, error: 'Invalid QR code' });
  }
}

module.exports = { processScan, validateQR };
