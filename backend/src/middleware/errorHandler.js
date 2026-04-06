function errorHandler(err, req, res, _next) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  } else {
    console.error('Error:', err.message);
  }

  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ error: 'Validation error', details: errors });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Referenced record not found' });
  }

  const statusCode = err.statusCode || 500;
  const message = statusCode < 500 ? err.message : 'Internal server error';

  res.status(statusCode).json({ error: message });
}

module.exports = { errorHandler };
