import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

async function loadComponent(filename) {
  const result = await build({ entryPoints: [fileURLToPath(new URL(filename, import.meta.url))], bundle: true, write: false,
    platform: 'node', format: 'cjs', external: ['react'], define: { 'import.meta.env.VITE_API_BASE_URL': '"http://test.invalid"' } });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}
const { default: BillingDetails, BalanceSummary, PaymentHistory } = await loadComponent('./BillingDetails.jsx');
const { PayModal, ReceiptModal } = await loadComponent('./PaymentParts.jsx');
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
const billing = { tenantId: 'tenant-1', rentBalance: 3000, utilityBalance: 1000, totalOutstanding: 4000,
  rentPaid: 2000, rentStatus: 'PARTIALLY_PAID', totalPaid: 2000, rentDueDate: '2099-09-30', rentObligations: [], utilityStatements: [], transactions: [] };

test('three separately labeled outstanding amounts are displayed', () => {
  const html = render(BalanceSummary, { billing });
  for (const text of ['Outstanding Rent', 'Outstanding Utilities', 'Total Outstanding', '3,000', '1,000', '4,000']) assert.ok(html.includes(text));
  assert.ok(!html.includes('Current Balance'));
});
test('unknown legacy balances are not displayed as zero', () => {
  const html = render(BalanceSummary, { billing: { rentBalance: null, utilityBalance: null, totalOutstanding: null } });
  assert.equal((html.match(/Review required/g) || []).length, 3); assert.ok(!html.includes('0.00'));
});
test('history shows exact allocations, reference, method, status and simulation', () => {
  const html = render(PaymentHistory, { transactions: [{ id: 'SNB-TEST-123', paymentMode: 'GCash', paymentType: 'COMBINED',
    amount: 4000, rentAllocation: 3000, utilityAllocation: 1000, status: 'PAID', simulated: true, paidAt: '2026-09-28T00:00:00Z' }] });
  for (const text of ['SNB-TEST-123', 'GCash', 'COMBINED', '4,000', '3,000', '1,000', 'PAID', 'Simulated']) assert.ok(html.includes(text));
});
test('legacy history never invents rent or utility allocations', () => {
  const html = render(PaymentHistory, { transactions: [{ id: 'OLD', amount: 5000, status: 'Successful' }] });
  assert.ok(html.includes('allocation unknown')); assert.equal((html.match(/Not recorded/g) || []).length, 3);
});
test('historical utility periods and itemized charges remain visible', () => {
  const statement = { id: 'UTIL-1', billingPeriod: '2026-08', statementDate: '2026-08-01', dueDate: '2026-08-30', revision: 1,
    waterUsage: 5, waterRate: 60, waterCharge: 300, electricityUsage: 100, electricityRate: 12, electricityCharge: 1200, parkingCharge: 1000,
    amount: 2500, paid: 0, balance: 2500, status: 'UNPAID', revisions: [] };
  const html = render(BillingDetails, { billing: { ...billing, utilityStatements: [statement, { ...statement, id: 'UTIL-2', billingPeriod: '2026-09' }] }, monthlyRent: 5000 });
  for (const text of ['2026-08', '2026-09', 'Water', 'Electricity', 'Parking', '2,500', 'Monthly Rent', 'Rent Balance']) assert.ok(html.includes(text));
});
test('checkout exposes Rent, Utilities, Both and explicit simulation notice', () => {
  const html = render(PayModal, { open: true, onClose() {}, onPaid() {}, billing });
  for (const text of ['Payment For', 'value="RENT"', 'value="UTILITY"', 'value="COMBINED"', 'Payment amount', 'No real funds are transferred']) assert.ok(html.includes(text));
});
test('receipt shows allocated amounts and cannot be mistaken for a live gateway receipt', () => {
  const html = render(ReceiptModal, { onClose() {}, receipt: { referenceCode: 'SNB-TEST', paidAt: '2026-09-28T00:00:00Z', paymentMode: 'GCash',
    paymentType: 'COMBINED', amount: 4000, rentAllocation: 3000, utilityAllocation: 1000, status: 'PAID', simulated: true } });
  for (const text of ['Simulated Payment Receipt', 'Rent Allocation', 'Utility Allocation', '3,000', '1,000', 'No real funds were transferred']) assert.ok(html.includes(text));
});
