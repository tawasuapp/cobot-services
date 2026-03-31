const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Customer } = require('../models');

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function customerLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!customer.portal_password_hash) {
      return res.status(403).json({ error: 'Portal access not configured' });
    }

    const isMatch = await bcrypt.compare(password, customer.portal_password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({ id: customer.id, role: 'customer', isCustomer: true });

    res.json({
      token,
      customer: {
        id: customer.id,
        company_name: customer.company_name,
        email: customer.email,
        contact_person: customer.contact_person,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  res.json({ user: req.user });
}

async function refreshToken(req, res, next) {
  try {
    const token = generateToken({ id: req.user.id, role: req.user.role });
    res.json({ token });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res) {
  // JWT is stateless, client should remove token
  res.json({ message: 'Logged out successfully' });
}

async function updateFcmToken(req, res, next) {
  try {
    const { token } = req.body;
    await User.update({ fcm_token: token }, { where: { id: req.user.id } });
    res.json({ message: 'FCM token updated' });
  } catch (error) {
    next(error);
  }
}

module.exports = { login, customerLogin, getMe, refreshToken, logout, updateFcmToken };
