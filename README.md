# Payment Collection & EMI Management System

This repository contains the complete implementation of a **Payment Collection & EMI Management System**, designed with a mobile-first responsive architecture. The application is divided into a Node.js/Express backend API and an Expo (React Native Web) frontend client.

---

## 🏗️ Architecture & Component Layout
1. **Backend**: [`payment-backend/`](file:///d:/TEST/payment-backend) - RESTful API serving customer data, processing transactions, and logging history. Configured to run on Node.js with MySQL/MariaDB.
2. **Frontend**: [`emi-calculator/`](file:///d:/TEST/emi-calculator) - A cross-platform app built using Expo, React Native, and React Native Web. It dynamically adjusts its layout for both desktop browsers and native mobile screens.

---

## 📱 Feature Highlights

### 1. Customer Portal
* **Account Lookup**: Quick account search (e.g. `ACC001`) with instant loan profile rendering.
* **Loan Details Card**: Interactive summary displaying Interest Rate, Tenure, EMI amount, and Remaining Balance.
* **Real-time Payments**: Standardized forms verifying outstanding balance limits and calculating dynamic balance updates.
* **Receipt Overlay**: A detailed success pop-up presenting automatic Transaction IDs and final receipt statistics.
* **Personal Log**: Dynamic logs retrieving past payment records instantly from the backend.

### 2. Admin Dashboard
* **Portfolio Metrics**: Aggregated widgets summarizing Total Outstanding Portfolio, Active Accounts, and Settled Loans.
* **Interactive Lists**: Dynamic search filter listing registered users, balance standings, and active status.
* **Detailed Profile Modal**: Expands customer entries on click to display complete loan details, interest summaries, and scrolling payment history logs.

### 3. Mobile Optimization
* **Native Cleartext Traffic**: Integrated `expo-build-properties` configured to allow HTTP API connections to the live backend server.
* **Responsive Modal Constraints**: Uses `Dimensions` constraints and flex layouts to keep details lists scrollable and prevent collapsing on smaller screens.
* **Cross-Platform Format Helpers**: Custom rendering utilities ensuring error-free currency and date localization on both iOS, Android (Hermes JS Engine), and web browsers.

---

## 🗄️ Database Schema

### 1. Customers Table
Tracks borrower profiles, interest terms, and current balance statuses.
```sql
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
```

### 2. Payments Table
Handles transactions, logs timestamps, and references the borrower.
```sql
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
```

---

## 🛠️ Local Development & Running Guide

### Step 1: Database Initialization
1. Ensure your local MySQL/MariaDB server is running.
2. The backend is configured to automatically create the database `payment_collection` and the required tables upon startup.
3. If the database tables are empty, the backend will **automatically seed 5 mock customer accounts** (`ACC001` - `ACC005`) for immediate testing.

### Step 2: Backend REST API (`payment-backend/`)
1. Navigate to the backend directory:
   ```bash
   cd payment-backend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Set up your environment variables by copying `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
4. Adjust your credentials in `.env` (Port, Database Name, User, Password, Port).
5. Start the API server:
   ```bash
   # Development Server (hot-reload)
   npm run dev

   # Production Server
   npm start
   ```
6. **Integration Verification**: Run the built-in test suite to verify endpoint responses:
   ```bash
   node test-api.js
   ```

### Step 3: Frontend Client App (`emi-calculator/`)
1. Navigate to the frontend directory:
   ```bash
   cd emi-calculator
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Launch the web interface:
   ```bash
   npm run web
   ```
   *The client application will launch in your web browser (defaulting to `http://localhost:8081`).*

---

## 📱 Mobile Verification & APK Generation

### 1. Local Testing with Expo Go
1. Start the Expo server inside the `emi-calculator` directory:
   ```bash
   npm start
   ```
2. A QR code will generate in your command prompt.
3. Download the **Expo Go** application on your device:
   * **Android**: Scan the terminal QR code using the Expo Go built-in scanner.
   * **iOS**: Scan the terminal QR code using the default iOS Camera app.
4. The app will bundle and load instantly. It connects to the live production endpoint by default.

### 2. Compiling the Android APK (via EAS Cloud Build)
To build a standalone APK for direct installation:
1. Install the EAS CLI utility globally:
   ```bash
   npm install -g eas-cli
   ```
2. Authenticate or create an Expo account:
   ```bash
   eas login
   ```
3. Trigger the Android preview compilation:
   ```bash
   eas build -p android --profile preview
   ```
4. Once completed, EAS returns a download URL and a QR code. Open the link on any Android phone to install the APK directly.

---

## 🚀 AWS EC2 Production Deployment

### Step 1: Security Groups on AWS
Launch an EC2 instance running Ubuntu Server 22.04 LTS. Configure incoming rules to allow traffic on:
* **Port 22**: SSH administration.
* **Port 80**: HTTP web client.
* **Port 3000**: Backend API endpoint.

### Step 2: Automated Server Configuration
An automated deployment file [`payment-backend/ec2-setup.sh`](file:///d:/TEST/payment-backend/ec2-setup.sh) is provided to configure the server automatically.
1. SSH into the instance:
   ```bash
   ssh -i /path/to/key.pem ubuntu@your-ec2-ip
   ```
2. Execute the script:
   ```bash
   curl -sSL https://raw.githubusercontent.com/<YOUR_GITHUB_USERNAME>/payment-backend/main/ec2-setup.sh | bash
   ```
   *The script installs Node.js, PM2, MySQL, and Nginx. It configures Nginx to serve the web files on `/` and proxy API calls to port `3000`.*

---

## 🔄 CI/CD Pipelines (GitHub Actions)

Separate workflows compile frontend assets and restart the Express server on EC2:

1. **Frontend Pipeline** (`.github/workflows/deploy.yml`):
   * Triggered on every commit pushed to `main`.
   * Packages Web builds via `npx expo export --platform web`.
   * Securely deploys static assets to `/var/www/html` on the EC2 server.

2. **Backend Pipeline** (`.github/workflows/deploy.yml`):
   * Triggered on every commit pushed to `main`.
   * Synchronizes script files to `/var/www/payment-backend`.
   * Installs production dependencies and reloads PM2 instances with zero-downtime.

### Required Secrets
Add these keys under your GitHub repository **Settings > Secrets and variables > Actions**:
* `EC2_HOST`: Target EC2 Public IP address.
* `EC2_USER`: `ubuntu`
* `EC2_SSH_KEY`: Raw text contents of your private key file (`.pem`).
* `EXPO_PUBLIC_API_URL`: (Only for Frontend repo) `http://<your-ec2-ip>/api` or `http://<your-ec2-ip>:3000`.
