const jwt = require('jsonwebtoken');
const { User, Customer } = require('../models');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Customer tokens have isCustomer flag
    if (decoded.isCustomer) {
      const customer = await Customer.findByPk(decoded.id, {
        attributes: { exclude: ['portal_password_hash'] },
      });
      if (!customer) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = { id: customer.id, role: 'customer', email: customer.email, company_name: customer.company_name };
      req.customer = customer;
      return next();
    }

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!user || user.status === 'inactive') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { authenticate };
