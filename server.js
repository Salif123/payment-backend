const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

let pool;

// Initialize Database and Tables
async function initDb() {
  const connectionConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : 'rootpassword',
  };

  try {
    // 1. Connect without database to create it
    const tempConnection = await mysql.createConnection(connectionConfig);
    const dbName = process.env.DB_NAME || 'payment_collection';
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await tempConnection.end();
    console.log(`Database "${dbName}" verified/created.`);

    // 2. Create the connection pool with the database specified
    pool = mysql.createPool({
      ...connectionConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // 3. Create Tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        account_number VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(100) NOT NULL,
        issue_date DATE NOT NULL,
        interest_rate DECIMAL(5, 2) NOT NULL,
        tenure INT NOT NULL,
        emi_due DECIMAL(15, 2) NOT NULL,
        remaining_balance DECIMAL(15, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_account_number (account_number)
      ) ENGINE=InnoDB;
    `);
    console.log('Customers table verified/created.');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_amount DECIMAL(15, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'Success',
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id)
      ) ENGINE=InnoDB;
    `);
    console.log('Payments table verified/created.');

    // 4. Seed Mock Data if empty
    const [rows] = await pool.query('SELECT COUNT(*) as count FROM customers');
    if (rows[0].count === 0) {
      console.log('Database empty. Seeding mock customers...');
      const mockCustomers = [
        ['ACC001', 'John Doe', '2026-01-15', 12.00, 12, 4500.00, 45000.00],
        ['ACC002', 'Jane Smith', '2025-11-20', 10.00, 24, 8500.00, 80000.00],
        ['ACC003', 'Mike Johnson', '2026-03-01', 15.00, 6, 2500.00, 10000.00],
        ['ACC004', 'Sarah Williams', '2025-06-05', 9.50, 36, 12000.00, 190000.00],
        ['ACC005', 'Robert Brown', '2026-02-10', 11.00, 18, 6000.00, 48000.00]
      ];

      const query = `
        INSERT INTO customers (account_number, customer_name, issue_date, interest_rate, tenure, emi_due, remaining_balance) 
        VALUES ?
      `;
      await pool.query(query, [mockCustomers]);
      console.log('Successfully seeded 5 mock customers.');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

// REST API Endpoints

// 1. GET /customers - Retrieve loan details of all customers
app.get('/customers', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. POST /payments - Make a payment for personal loan
app.post('/payments', async (req, res) => {
  const { account_number, amount } = req.body;

  // Validation
  if (!account_number || !amount) {
    return res.status(400).json({ error: 'Account number and payment amount are required.' });
  }

  const paymentAmount = parseFloat(amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ error: 'Payment amount must be a positive number.' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Find the customer
    const [customers] = await connection.query(
      'SELECT * FROM customers WHERE account_number = ? FOR UPDATE',
      [account_number]
    );

    if (customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    const customer = customers[0];

    if (customer.remaining_balance <= 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Loan is already fully paid.' });
    }

    // 2. Deduct remaining balance and adjust EMI
    const newBalance = Math.max(0, customer.remaining_balance - paymentAmount);
    // If balance is fully paid, emi_due should become 0
    const newEmiDue = newBalance === 0 ? 0 : customer.emi_due;

    await connection.query(
      'UPDATE customers SET remaining_balance = ?, emi_due = ? WHERE id = ?',
      [newBalance, newEmiDue, customer.id]
    );

    // 3. Create payment record
    const transactionId = 'TXN-' + Date.now() + '-' + Math.floor(1000 + Math.random() * 9000);
    await connection.query(
      'INSERT INTO payments (customer_id, payment_amount, transaction_id, status) VALUES (?, ?, ?, ?)',
      [customer.id, paymentAmount, transactionId, 'Success']
    );

    // Commit transaction
    await connection.commit();

    // Fetch updated customer details
    const [updatedCustomers] = await pool.query('SELECT * FROM customers WHERE id = ?', [customer.id]);
    const updatedCustomer = updatedCustomers[0];

    res.status(201).json({
      message: 'Payment processed successfully',
      receipt: {
        transaction_id: transactionId,
        account_number: updatedCustomer.account_number,
        customer_name: updatedCustomer.customer_name,
        payment_amount: paymentAmount,
        payment_date: new Date(),
        remaining_balance: updatedCustomer.remaining_balance,
        emi_due: updatedCustomer.emi_due,
        status: 'Success'
      }
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Internal server error during payment processing.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 3. GET /payments/:account_number - Retrieve payment history for specific account number
app.get('/payments/:account_number', async (req, res) => {
  const { account_number } = req.params;

  try {
    // First, find the customer
    const [customers] = await pool.query('SELECT id FROM customers WHERE account_number = ?', [account_number]);
    
    if (customers.length === 0) {
      return res.status(404).json({ error: 'Customer account not found.' });
    }

    const customerId = customers[0].id;

    // Retrieve payment logs
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE customer_id = ? ORDER BY payment_date DESC',
      [customerId]
    );

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await initDb();
});
