-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS payment_collection;
USE payment_collection;

-- Customers Table to store loan details
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    issue_date DATE NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    tenure INT NOT NULL, -- in months
    emi_due DECIMAL(15, 2) NOT NULL,
    remaining_balance DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_account_number (account_number)
);

-- Payments Table to track EMI payments
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Success',
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer_id (customer_id)
);
