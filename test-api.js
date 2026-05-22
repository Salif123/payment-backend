const BACKEND_URL = 'http://localhost:3000';

async function runTests() {
  console.log('--- Starting API Integration Tests ---');

  try {
    // Test 1: GET /customers
    console.log('\nTest 1: Fetching all customers (GET /customers)...');
    const customersResponse = await fetch(`${BACKEND_URL}/customers`);
    if (!customersResponse.ok) {
      throw new Error(`Failed to fetch customers: ${customersResponse.statusText}`);
    }
    const customers = await customersResponse.json();
    console.log(`Success! Found ${customers.length} customers.`);
    console.log('Customer Accounts:', customers.map(c => `${c.customer_name} (${c.account_number}) - EMI Due: ₹${c.emi_due}, Bal: ₹${c.remaining_balance}`));

    if (customers.length === 0) {
      throw new Error('No customers found. Did seeding fail?');
    }

    const testAccount = customers[0].account_number;

    // Test 2: POST /payments
    const payAmount = 2000.00;
    console.log(`\nTest 2: Submitting a payment of ₹${payAmount} for account ${testAccount} (POST /payments)...`);
    const paymentResponse = await fetch(`${BACKEND_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        account_number: testAccount,
        amount: payAmount,
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      throw new Error(`Failed to make payment: ${JSON.stringify(errorData)}`);
    }

    const paymentReceipt = await paymentResponse.json();
    console.log('Success! Receipt received:', paymentReceipt.receipt);

    // Test 3: GET /payments/:account_number
    console.log(`\nTest 3: Fetching payment history for account ${testAccount} (GET /payments/${testAccount})...`);
    const historyResponse = await fetch(`${BACKEND_URL}/payments/${testAccount}`);
    if (!historyResponse.ok) {
      throw new Error(`Failed to fetch history: ${historyResponse.statusText}`);
    }
    const history = await historyResponse.json();
    console.log(`Success! Found ${history.length} payment records.`);
    console.log('Payment logs:', history.map(p => `Date: ${new Date(p.payment_date).toLocaleString()} | Amt: ₹${p.payment_amount} | Status: ${p.status} | TxnID: ${p.transaction_id}`));

    console.log('\n--- All API Integration Tests Passed Successfully! ---');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Small delay to ensure server has started if run concurrently
setTimeout(runTests, 1000);
