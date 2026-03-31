function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

function requireSupervisorOrAdmin(req, res, next) {
  return requireRole('admin', 'supervisor')(req, res, next);
}

module.exports = { requireRole, requireAdmin, requireSupervisorOrAdmin };
