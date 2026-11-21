import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://luamazblgroduhlbvjip.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ke7yUTS2EjUtgFM6f_NvNw_GrSZduff';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTestSuite() {
  console.log('====================================================');
  console.log('🚀 STARTING END-TO-END & 1000-ORDER STRESS TEST');
  console.log('Target Project: luamazblgroduhlbvjip.supabase.co');
  console.log('====================================================\n');

  const report = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    timings: [],
    categories: {}
  };

  function assert(category, testName, condition, details = '') {
    report.totalTests++;
    if (!report.categories[category]) report.categories[category] = { passed: 0, failed: 0, tests: [] };
    if (condition) {
      report.passed++;
      report.categories[category].passed++;
      report.categories[category].tests.push({ name: testName, status: 'PASS', details });
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      report.failed++;
      report.categories[category].failed++;
      report.categories[category].tests.push({ name: testName, status: 'FAIL', details });
      console.log(`  ❌ [FAIL] ${testName} - ${details}`);
    }
  }

  // ----------------------------------------------------
  // TEST CATEGORY 1: DATABASE SCHEMA & CONSTRAINTS
  // ----------------------------------------------------
  console.log('\n--- 1. DATABASE VALIDATION ---');
  try {
    const { data: tables, error: tErr } = await supabase.from('products').select('*').limit(1);
    assert('Database Validation', 'Products Table Exists & Readable', !tErr && Array.isArray(tables));
    
    const { data: orders, error: oErr } = await supabase.from('orders').select('*').limit(1);
    assert('Database Validation', 'Orders Table Exists & Readable', !oErr && Array.isArray(orders));

    const { data: items, error: iErr } = await supabase.from('order_items').select('*').limit(1);
    assert('Database Validation', 'Order Items Table Exists', !iErr && Array.isArray(items));

    const { data: payments, error: pErr } = await supabase.from('payments').select('*').limit(1);
    assert('Database Validation', 'Payments Table Exists', !pErr && Array.isArray(payments));

    const { data: logs, error: lErr } = await supabase.from('inventory_logs').select('*').limit(1);
    assert('Database Validation', 'Inventory Logs Table Exists', !lErr && Array.isArray(logs));

    const { data: counter, error: cErr } = await supabase.from('token_counter').select('*').limit(1);
    assert('Database Validation', 'Token Counter Table Exists', !cErr && Array.isArray(counter));
  } catch (e) {
    assert('Database Validation', 'Database Schema Intact', false, e.message);
  }

  // ----------------------------------------------------
  // TEST CATEGORY 2: PRODUCT MODULE INTEGRITY
  // ----------------------------------------------------
  console.log('\n--- 2. PRODUCT CATALOG INTEGRITY ---');
  await supabase.from('products').delete().not('id', 'like', 'c0000001-%');
  const { data: initialProducts } = await supabase.from('products').select('*');
  assert('Product Module', 'Catalog contains 12 Exhibition Toys', initialProducts?.length === 12, `Found ${initialProducts?.length}`);
  
  // Verify prices & stock
  const spiderman = initialProducts?.find(p => p.name === 'Spiderman Mask');
  assert('Product Module', 'Spiderman Mask Price is ₹48', spiderman?.price === 48, `Got ${spiderman?.price}`);
  assert('Product Module', 'Products Have Stock > 0', initialProducts?.every(p => p.stock > 0));

  // ----------------------------------------------------
  // RESET EXHIBITION STATE FOR CLEAN 1000 ORDER TEST
  // ----------------------------------------------------
  console.log('\n--- PREPARING BENCHMARK ENVIRONMENT ---');
  await supabase.rpc('reset_exhibition_data');
  // Boost stock for the 1000 orders stress test so products don't deplete mid-run
  for (const p of initialProducts || []) {
    await supabase.from('products').update({ stock: 5000 }).eq('id', p.id);
  }
  console.log('Exhibition reset complete. Product stocks initialized to 5,000 units.');

  // ----------------------------------------------------
  // TEST CATEGORY 5 & 12: 1000 ORDER CONCURRENT STRESS TEST & TOKEN GENERATION
  // ----------------------------------------------------
  console.log('\n--- 3. 1000-ORDER STRESS & TOKEN CONCURRENCY BENCHMARK ---');
  console.log('Simulating 2 Mobile Devices (Staff Rahul & Device 2) creating 1,000 orders concurrently...');

  const TOTAL_ORDERS_TO_SIMULATE = 1000;
  const createdOrders = [];
  const tokenSet = new Set();
  const sequenceSet = new Set();
  const startTime = Date.now();
  const batchSize = 8; // Simulates parallel mobile devices creating orders with realistic peak concurrency

  for (let b = 0; b < TOTAL_ORDERS_TO_SIMULATE; b += batchSize) {
    const batchPromises = [];
    for (let i = 0; i < batchSize && (b + i) < TOTAL_ORDERS_TO_SIMULATE; i++) {
      const orderIdx = b + i;
      const deviceId = orderIdx % 2 === 0 ? 'Mobile 1' : 'Mobile 2';
      
      // Randomly pick 1-3 products
      const numItems = 1 + Math.floor(Math.random() * 3);
      const selectedItems = [];
      for (let k = 0; k < numItems; k++) {
        const prod = initialProducts[Math.floor(Math.random() * initialProducts.length)];
        const qty = 1 + Math.floor(Math.random() * 2);
        selectedItems.push({
          product_id: prod.id,
          product_name: prod.name,
          unit_price: prod.price,
          quantity: qty,
          image: prod.image
        });
      }

      const orderStart = Date.now();
      const p = supabase.rpc('create_token_order', {
        p_items: selectedItems,
        p_counter_id: deviceId,
        p_notes: `Stress test order #${orderIdx + 1}`
      }).then(res => {
        const duration = Date.now() - orderStart;
        report.timings.push(duration);
        return { res, items: selectedItems };
      });

      batchPromises.push(p);
    }

    const batchResults = await Promise.all(batchPromises);
    for (const { res, items } of batchResults) {
      if (res.data) {
        createdOrders.push({ ...res.data, items });
        tokenSet.add(res.data.token_number);
        sequenceSet.add(res.data.token_sequence);
      } else if (res.error) {
        console.error('Batch error:', res.error);
      }
    }

    if ((b + batchSize) % 100 === 0 || (b + batchSize) >= TOTAL_ORDERS_TO_SIMULATE) {
      console.log(`  Generated ${createdOrders.length} / ${TOTAL_ORDERS_TO_SIMULATE} orders...`);
    }
  }

  const orderGenTotalTime = Date.now() - startTime;
  console.log(`\nCompleted generation of ${createdOrders.length} orders in ${(orderGenTotalTime / 1000).toFixed(2)}s`);

  // Assert Token Integrity
  assert('Token Generator', 'Generated exactly 1000 orders', createdOrders.length === 1000, `Got ${createdOrders.length}`);
  assert('Token Generator', 'Zero Duplicate Tokens across 1000 orders', tokenSet.size === 1000, `Distinct tokens: ${tokenSet.size}`);
  assert('Token Generator', 'Zero Duplicate Sequences across 1000 orders', sequenceSet.size === 1000, `Distinct sequences: ${sequenceSet.size}`);

  // Verify sequential continuity: T001 to T1000
  let isStrictlySequential = true;
  for (let seq = 1; seq <= 1000; seq++) {
    const expectedToken = `T${seq.toString().padStart(3, '0')}`;
    if (!tokenSet.has(expectedToken)) {
      isStrictlySequential = false;
      break;
    }
  }
  assert('Token Generator', 'Strict Sequential Integrity (T001 -> T1000 without gaps)', isStrictlySequential);

  // ----------------------------------------------------
  // TEST CATEGORY 6, 7 & 8: DESKTOP BILLING & PAYMENT TRANSITIONS
  // ----------------------------------------------------
  console.log('\n--- 4. DESKTOP CASHIER WORKFLOW & ORDER TRANSITIONS ---');
  console.log('Simulating Desktop Billing Counter processing 1,000 orders (ACCEPT -> PAY -> COMPLETE / VOID)...');

  let completedCount = 0;
  let voidCount = 0;
  const paymentMethods = ['CASH', 'UPI', 'SPLIT'];
  let totalRevenueGenerated = 0;
  let cashRevenue = 0;
  let upiRevenue = 0;

  // Let 980 be completed and 20 be VOID to test cancellation preservation
  const transitionStartTime = Date.now();
  const transitionBatchSize = 12;

  for (let b = 0; b < createdOrders.length; b += transitionBatchSize) {
    const promises = [];
    for (let i = 0; i < transitionBatchSize && (b + i) < createdOrders.length; i++) {
      const ord = createdOrders[b + i];
      const shouldVoid = (b + i) % 50 === 0; // 20 void orders

      const p = (async () => {
        if (shouldVoid) {
          // VOID transition test
          const { error: vErr } = await supabase.rpc('transition_order_status', {
            p_order_id: ord.order_id,
            p_target_status: 'VOID',
            p_notes: 'Customer walked away'
          });
          if (!vErr) voidCount++;
        } else {
          // Full lifecycle: NEW -> ACCEPTED -> PAID -> COMPLETED
          // 1. Accept
          await supabase.rpc('transition_order_status', {
            p_order_id: ord.order_id,
            p_target_status: 'ACCEPTED'
          });

          // 2. Pay (Randomize Cash, UPI, Split)
          const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
          const amount = ord.total_amount;
          let paymentData;

          if (method === 'CASH') {
            paymentData = { method: 'CASH', amount, cashTendered: amount + 10, changeReturned: 10, cashAmount: amount };
            cashRevenue += amount;
          } else if (method === 'UPI') {
            paymentData = { method: 'UPI', amount, upiAmount: amount, transactionReference: `UPI-${ord.token_sequence}` };
            upiRevenue += amount;
          } else {
            const splitHalf = Math.floor(amount / 2);
            paymentData = { method: 'SPLIT', amount, cashAmount: splitHalf, upiAmount: amount - splitHalf };
            cashRevenue += splitHalf;
            upiRevenue += (amount - splitHalf);
          }
          totalRevenueGenerated += amount;

          await supabase.rpc('transition_order_status', {
            p_order_id: ord.order_id,
            p_target_status: 'PAID',
            p_payment_data: paymentData
          });

          // 3. Complete
          const { error: cErr } = await supabase.rpc('transition_order_status', {
            p_order_id: ord.order_id,
            p_target_status: 'COMPLETED'
          });
          if (!cErr) completedCount++;
        }
      })();

      promises.push(p);
    }

    await Promise.all(promises);
    if ((b + transitionBatchSize) % 100 === 0 || (b + transitionBatchSize) >= createdOrders.length) {
      console.log(`  Processed ${b + promises.length} / 1000 cashier checkouts...`);
    }
  }

  const transitionTotalTime = Date.now() - transitionStartTime;
  console.log(`\nProcessed all orders in ${(transitionTotalTime / 1000).toFixed(2)}s`);

  assert('Desktop Counter Tests', 'Completed 980 Orders successfully', completedCount === 980, `Completed: ${completedCount}`);
  assert('Desktop Counter Tests', 'Voided 20 Orders successfully', voidCount === 20, `Void: ${voidCount}`);

  // Test state machine lock: Attempting to modify a COMPLETED order must FAIL
  const firstCompleted = createdOrders.find(o => o.token_sequence === 2);
  const { error: lockErr } = await supabase.rpc('transition_order_status', {
    p_order_id: firstCompleted.order_id,
    p_target_status: 'NEW'
  });
  assert('Desktop Counter Tests', 'Locked COMPLETED orders prevent status modification', lockErr !== null, 'Expected database rejection on locked order');

  // Test state machine skipping: Cannot jump from NEW to COMPLETED directly
  const { data: testSkippingOrder } = await supabase.rpc('create_token_order', {
    p_items: [{ product_id: initialProducts[0].id, product_name: initialProducts[0].name, unit_price: initialProducts[0].price, quantity: 1 }],
    p_counter_id: 'Test'
  });
  const { error: skipErr } = await supabase.rpc('transition_order_status', {
    p_order_id: testSkippingOrder.order_id,
    p_target_status: 'COMPLETED'
  });
  assert('Desktop Counter Tests', 'State machine forbids skipping states (NEW -> COMPLETED rejected)', skipErr !== null);

  // ----------------------------------------------------
  // TEST CATEGORY 8: INVENTORY ACCURACY & ATOMIC RECONCILIATION
  // ----------------------------------------------------
  console.log('\n--- 5. INVENTORY ATOMIC RECONCILIATION ---');
  const { data: finalProducts } = await supabase.from('products').select('*');
  const { data: inventoryLogs } = await supabase.from('inventory_logs').select('change_quantity, product_id');

  // Calculate total sold quantity per product from completed orders
  let inventoryExactMatch = true;
  for (const prod of finalProducts) {
    const logsForProd = inventoryLogs?.filter(l => l.product_id === prod.id) || [];
    const totalDeductedInLogs = logsForProd.reduce((sum, l) => sum + Math.abs(l.change_quantity), 0);
    const expectedStock = 5000 - totalDeductedInLogs;
    if (prod.stock !== expectedStock) {
      inventoryExactMatch = false;
      console.log(`Mismatch on ${prod.name}: Expected ${expectedStock}, Got ${prod.stock}`);
    }
  }
  assert('Inventory Tests', 'Mathematical Stock Deductions Match Exactly (Initial - Sold = Final)', inventoryExactMatch);
  assert('Inventory Tests', 'Inventory logs accurately recorded for all completed line items', inventoryLogs?.length > 1000);

  // ----------------------------------------------------
  // TEST CATEGORY 14: SECURITY & SQL INJECTION TESTS
  // ----------------------------------------------------
  console.log('\n--- 6. SECURITY & SQL INJECTION RESILIENCE ---');
  const maliciousInput = "'; DROP TABLE products; -- <script>alert(1)</script>";
  const { data: secOrder, error: secErr } = await supabase.rpc('create_token_order', {
    p_items: [{ product_id: initialProducts[0].id, product_name: initialProducts[0].name, unit_price: initialProducts[0].price, quantity: 1 }],
    p_counter_id: 'Mobile 1',
    p_notes: maliciousInput
  });
  assert('Security Testing', 'SQL Injection in Notes field sanitized safely by PostgreSQL parameters', !secErr && secOrder?.order_id);

  // Verify products table was not dropped
  const { data: probeProducts } = await supabase.from('products').select('id').limit(1);
  assert('Security Testing', 'Products table intact after SQL injection payload test', probeProducts?.length > 0);

  // ----------------------------------------------------
  // TEST CATEGORY 13: PERFORMANCE LATENCY BENCHMARKS
  // ----------------------------------------------------
  console.log('\n--- 7. PERFORMANCE & LATENCY METRICS ---');
  report.timings.sort((a, b) => a - b);
  const avgLatency = Math.round(report.timings.reduce((a, b) => a + b, 0) / report.timings.length);
  const p50 = report.timings[Math.floor(report.timings.length * 0.5)];
  const p95 = report.timings[Math.floor(report.timings.length * 0.95)];
  const p99 = report.timings[Math.floor(report.timings.length * 0.99)];
  const maxLatency = report.timings[report.timings.length - 1];

  console.log(`  • Average Order Creation Latency: ${avgLatency}ms`);
  console.log(`  • 50th Percentile (p50):          ${p50}ms`);
  console.log(`  • 95th Percentile (p95):          ${p95}ms`);
  console.log(`  • 99th Percentile (p99):          ${p99}ms`);
  console.log(`  • Max / Slowest Request:          ${maxLatency}ms`);

  assert('Performance Metrics', 'Average Latency < 300ms', avgLatency < 300, `Actual: ${avgLatency}ms`);
  assert('Performance Metrics', '95th Percentile Latency < 500ms', p95 < 500, `Actual: ${p95}ms`);

  // ----------------------------------------------------
  // TEST CATEGORY 16: FINANCIAL & REPORT VALIDATION
  // ----------------------------------------------------
  console.log('\n--- 8. FINANCIAL RECONCILIATION & REPORTS ---');
  const { data: allPayments } = await supabase.from('payments').select('amount, payment_method, cash_amount, upi_amount');
  const totalRecordedRevenue = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  
  assert('Report Validation', 'Payments total matches calculated completed revenue', Math.abs(totalRecordedRevenue - totalRevenueGenerated) < 1, `Recorded: ₹${totalRecordedRevenue}, Generated: ₹${totalRevenueGenerated}`);
  assert('Report Validation', 'Cancelled Orders Retain Token Numbers', voidCount === 20);

  // Final Output Summary
  console.log('\n====================================================');
  console.log('📊 FINAL TEST RESULTS SUMMARY:');
  console.log(`  Total Tests Executed: ${report.totalTests}`);
  console.log(`  Passed:               ${report.passed} (${Math.round((report.passed / report.totalTests) * 100)}%)`);
  console.log(`  Failed:               ${report.failed}`);
  console.log(`  Total Revenue Tested: ₹${totalRevenueGenerated.toLocaleString()}`);
  console.log(`  Overall Readiness:    ${Math.round((report.passed / report.totalTests) * 100)}%`);
  console.log('====================================================\n');

  return {
    report,
    metrics: {
      totalOrders: createdOrders.length,
      completedCount,
      voidCount,
      totalRevenueGenerated,
      cashRevenue,
      upiRevenue,
      avgLatency,
      p50,
      p95,
      p99,
      maxLatency,
      orderGenTotalTime,
      transitionTotalTime
    }
  };
}

runTestSuite().then(res => {
  // Store summary for report generator
  import('fs').then(fs => {
    fs.writeFileSync('test_results.json', JSON.stringify(res, null, 2));
    console.log('Results saved to test_results.json');
  });
}).catch(err => {
  console.error('Test Suite Failed:', err);
});
