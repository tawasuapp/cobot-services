'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('customers', 'customer_code', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true,
    });

    // Backfill existing rows with CUST-#### codes.
    const [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM customers WHERE customer_code IS NULL ORDER BY created_at ASC`
    );
    let n = 1;
    for (const row of rows) {
      const code = `CUST-${String(n).padStart(4, '0')}`;
      await queryInterface.sequelize.query(
        `UPDATE customers SET customer_code = :code WHERE id = :id`,
        { replacements: { code, id: row.id } }
      );
      n++;
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('customers', 'customer_code');
  },
};
