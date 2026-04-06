const bcrypt = require('bcryptjs');
const { User } = require('../models');
const { paginateQuery, formatPaginatedResponse } = require('../utils/helpers');

async function listUsers(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, first_name, last_name, phone, role } = req.body;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      email,
      password_hash,
      first_name,
      last_name,
      phone,
      role,
    });

    const { password_hash: _, ...userData } = user.toJSON();
    res.status(201).json(userData);
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    // Users can only update themselves, admins can update anyone
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = { ...req.body };
    delete updates.password_hash;
    delete updates.id;
    // Only admins can change roles
    if (req.user.role !== 'admin') delete updates.role;

    if (updates.password) {
      const { validatePassword } = require('./authController');
      const pwError = validatePassword(updates.password);
      if (pwError) return res.status(400).json({ error: pwError });
      const salt = await bcrypt.genSalt(12);
      updates.password_hash = await bcrypt.hash(updates.password, salt);
      delete updates.password;
    }

    await user.update(updates);
    const { password_hash: _, ...userData } = user.toJSON();
    res.json(userData);
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

async function listOperators(req, res, next) {
  try {
    const operators = await User.findAll({
      where: { role: 'robot_operator', status: 'active' },
      attributes: { exclude: ['password_hash'] },
      order: [['first_name', 'ASC']],
    });
    res.json(operators);
  } catch (error) {
    next(error);
  }
}

async function listDrivers(req, res, next) {
  try {
    const drivers = await User.findAll({
      where: { role: 'driver', status: 'active' },
      attributes: { exclude: ['password_hash'] },
      order: [['first_name', 'ASC']],
    });
    res.json(drivers);
  } catch (error) {
    next(error);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deleteUser, listOperators, listDrivers };
