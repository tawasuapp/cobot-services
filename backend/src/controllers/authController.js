const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Customer } = require('../models');

// In-memory store for IVD login sessions (2-min expiry)
const ivdSessions = new Map();

const PASSWORD_MIN_LENGTH = 8;

function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

function validatePassword(password) {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Constant-time lookup to prevent timing attacks
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!user) {
      // Still hash to prevent timing-based user enumeration
      await bcrypt.hash('dummy', 10);
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

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const customer = await Customer.findOne({ where: { email: email.toLowerCase().trim() } });
    if (!customer) {
      await bcrypt.hash('dummy', 10);
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
  res.json({ message: 'Logged out successfully' });
}

async function updateFcmToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string' || token.length > 500) {
      return res.status(400).json({ error: 'Invalid FCM token' });
    }
    await User.update({ fcm_token: token }, { where: { id: req.user.id } });
    res.json({ message: 'FCM token updated' });
  } catch (error) {
    next(error);
  }
}

// --- IVD QR Code Login (2-min expiry, one-time use) ---

function cleanExpiredIvdSessions() {
  const now = Date.now();
  for (const [id, session] of ivdSessions) {
    if (now - session.createdAt > 2 * 60 * 1000) ivdSessions.delete(id);
  }
}

async function createIvdSession(req, res) {
  cleanExpiredIvdSessions();
  // Limit total active sessions to prevent memory abuse
  if (ivdSessions.size > 100) {
    return res.status(429).json({ error: 'Too many active sessions' });
  }
  const sessionId = crypto.randomUUID();
  ivdSessions.set(sessionId, { status: 'pending', createdAt: Date.now() });
  res.json({ sessionId });
}

async function approveIvdSession(req, res) {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(400).json({ error: 'Valid sessionId is required' });
  }
  const session = ivdSessions.get(sessionId);
  if (!session || session.status !== 'pending') {
    return res.status(404).json({ error: 'Invalid or expired session' });
  }
  const token = generateToken({ id: req.user.id, role: req.user.role });
  session.status = 'approved';
  session.token = token;
  session.user = {
    id: req.user.id,
    email: req.user.email,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    role: req.user.role,
  };
  res.json({ message: 'Session approved' });
}

async function checkIvdSession(req, res) {
  const session = ivdSessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  if (session.status === 'approved') {
    ivdSessions.delete(req.params.sessionId);
    return res.json({ status: 'approved', token: session.token, user: session.user });
  }
  res.json({ status: 'pending' });
}

module.exports = {
  login,
  customerLogin,
  getMe,
  refreshToken,
  logout,
  updateFcmToken,
  validatePassword,
  createIvdSession,
  approveIvdSession,
  checkIvdSession,
};
