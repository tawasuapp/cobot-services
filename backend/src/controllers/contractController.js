const { Contract, Customer } = require('../models');
const { Op } = require('sequelize');
const { paginateQuery, formatPaginatedResponse, generateContractNumber } = require('../utils/helpers');
const { logActivity } = require('../services/notificationService');

const contractIncludes = [
  { model: Customer, attributes: ['id', 'company_name', 'contact_person', 'email', 'phone'] },
];

async function listContracts(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const where = {};

    if (req.query.status) where.status = req.query.status;
    if (req.query.customer_id) where.customer_id = req.query.customer_id;
    if (req.query.contract_type) where.contract_type = req.query.contract_type;

    const { rows, count } = await Contract.findAndCountAll({
      where,
      include: contractIncludes,
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

async function getContract(req, res, next) {
  try {
    const contract = await Contract.findByPk(req.params.id, { include: contractIncludes });
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
    res.json(contract);
  } catch (error) {
    next(error);
  }
}

async function createContract(req, res, next) {
  try {
    const data = { ...req.body, contract_number: generateContractNumber() };
    const contract = await Contract.create(data);
    const fullContract = await Contract.findByPk(contract.id, { include: contractIncludes });

    await logActivity({
      userId: req.user.id,
      action: 'contract_created',
      description: `Created contract ${contract.contract_number}`,
      entityType: 'contract',
      entityId: contract.id,
    });

    res.status(201).json(fullContract);
  } catch (error) {
    next(error);
  }
}

async function updateContract(req, res, next) {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    const updates = { ...req.body };
    delete updates.id;
    delete updates.contract_number;

    await contract.update(updates);
    const fullContract = await Contract.findByPk(contract.id, { include: contractIncludes });
    res.json(fullContract);
  } catch (error) {
    next(error);
  }
}

async function deleteContract(req, res, next) {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    await contract.destroy();
    res.json({ message: 'Contract deleted' });
  } catch (error) {
    next(error);
  }
}

async function getExpiringContracts(req, res, next) {
  try {
    const { page, limit, offset } = paginateQuery(req.query);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const { rows, count } = await Contract.findAndCountAll({
      where: {
        status: 'active',
        end_date: {
          [Op.between]: [now.toISOString().split('T')[0], thirtyDaysFromNow.toISOString().split('T')[0]],
        },
      },
      include: contractIncludes,
      order: [['end_date', 'ASC']],
      limit,
      offset,
    });

    res.json(formatPaginatedResponse(rows, count, page, limit));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listContracts, getContract, createContract, updateContract, deleteContract,
  getExpiringContracts,
};
