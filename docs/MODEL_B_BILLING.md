# Model B billing implementation

## 1. Original problem

`AdminTenantService.presentBill` replaced `Tenant.currentBalance` with the utility total. Tenant checkout and the admin's Mark as Paid action then cleared that same field and recorded the transaction as rent. Consequently, utility billing could erase rent, payment history could mislabel utilities, and earlier utility statements were replaced by a single latest breakdown. Tenant GCash checkout also deliberately recorded every attempt as a failure. Several billing UI controls advertised simulated work as completed work.

The refactor retains the existing tenant, billing, notification, and authentication architecture. No maintenance, staff, Gemini, or authentication workflows were rebuilt.

## 2. Final accounting model

MODEL B:

- **Rent Balance:** sum of each issued rent obligation's charge minus its allocated payments. Monthly rent remains on the Tenant record. Each rent obligation has its own period, due date, paid amount, remaining balance, and calculated status.
- **Utility Statement:** independently identified statements by tenant and `YYYY-MM` period, with water/electricity readings, rates, itemized charges, parking, original total, paid amount, balance, dates, status, and revision history.
- **Payment Balance / history:** each recorded payment has an immutable reference and exact rent/utility allocations. `totalOutstanding` is read-only and calculated as `rentBalance + utilityBalance`; it is not a separate writable balance.

Creating a utility statement never changes rent. RENT payments never change utilities. UTILITY payments never change rent. COMBINED (BOTH is accepted as an alias) pays rent in due-date order, overdue first, followed by unpaid utility statements in due-date/period order. This includes any future rent obligations already explicitly issued by management.

No overpayment, refund, credit wallet, or negative balance is supported. Payment amounts must be positive, no more than the selected outstanding amount, and precise to centavos. Usage/rate inputs support up to six decimal places; each utility charge is rounded HALF_UP to two decimal places. Parking remains PHP 1,000 when selected. Electricity uses the existing server-controlled PHP 14.7424/kWh reference rate, ignoring any client rate; this is not a live rate feed.

## 3. Database/schema changes

The existing `billing` collection is extended, not duplicated:

- `schemaVersion: 2`, optimistic-locking `version`.
- `rentObligations[]`, `utilityStatements[]`, and existing `transactions[]` / `paymentMethods[]`.
- Transactions include tenant ID, reference (`id`), idempotency key, internal request fingerprint, amount, payment type, rent allocation, utility allocation, per-obligation allocation IDs/periods, optional single related utility-statement ID, payment method snapshot, status, created/paid timestamps, simulation flag, and management recorder identity where applicable.
- A `notificationOutbox[]` is committed with the accounting changes. A scheduled dispatcher delivers insert-only notifications and retries failed deliveries. It advances the ledger version when removing delivered entries, so it cannot overwrite concurrent accounting work.
- Reconciliation metadata retains the legacy amount, audit note, actor, and time. Old single-statement breakdowns and old transactions remain available as evidence. Unrecoverable allocations remain unknown, not fabricated.
- Account removal archives the billing document with a tenant identity snapshot instead of deleting financial history. Admin payment APIs can still retrieve it. The existing explicit full-database cleanup remains destructive, including billing history; it is not a financial archive feature.

Authoritative amount/paid fields use Java `BigDecimal` and BSON Decimal128. Decimal values in immutable embedded allocation/revision records retain exact decimal representations through Spring's converter as well. Old numeric transaction amounts remain readable; conversion is covered by tests.

Tenant `currentBalance` survives only as hidden, read-only legacy evidence (`legacyCurrentBalance` mapped to the old Mongo field). It is never used for new charges or payments. Tenant API rent/utility/total projections are transient and derived from Billing. `currentBalanceDue` and the old single breakdown are also legacy-only, hidden from the tenant billing response. Dashboard usage comes from the latest verified utility statement.

### Atomicity and retries

All obligation changes, allocations, history, and pending notifications are saved in **one versioned MongoDB document**. A failed or conflicting write cannot independently commit a balance deduction without its transaction. Optimistic conflicts reload and revalidate, including the idempotency key, with a bounded retry. This works with a standalone MongoDB server; multi-document transactions or replica-set transactions are not required for a payment.

Clients must reuse `idempotencyKey` when retrying the same payment. Reusing a key with changed details is rejected. The browser stores a pending request in session storage until its outcome is resolved; a missing/uncertain response leaves the same request available to retry. The database is the accounting authority, not browser storage.

## 4. Backend/API changes

Existing routes are reused:

| Route | New behavior |
|---|---|
| `GET /api/billing` | Current authenticated tenant's separate balances, all rent periods, all utility statements/revisions, and payment history |
| `POST /api/billing/pay` | Explicitly simulated payment with server-side allocation and idempotency |
| Existing payment-method routes | Preserve the versioned ledger; stale edits receive a conflict |
| `GET /api/admin/tenants` | Separate rent/utility/total fields and review status, not ambiguous currentBalance |
| `GET /api/admin/payments` | Recent payments include payment types, allocations, simulation flag; archived accounts retain history |
| `GET /api/admin/payments/tenant/{id}` | Full tenant ledger/history and preserved legacy evidence; supports archived accounts |
| `POST /api/admin/tenants/{id}/bills` | Present a period-specific utility statement; changed existing statements require `reissue: true` and matching `expectedRevision` |
| `POST /api/admin/tenants/{id}/mark-paid` | Route retained, but no longer clears a generic balance; requires explicit payment amount/type/key and actual received method |
| `POST /api/admin/tenants/{id}/rent` | Issue stored monthly rent for a specified period/due date; reject duplicate periods |
| `POST /api/admin/tenants/{id}/billing/reconcile` | Explicit, version-checked, audited opening rent and utility obligations |

Tenant routes resolve identity from the existing authenticated TenantContext. Admin routes remain under the existing ADMIN role guard. No caller-supplied tenant ID can redirect tenant checkout to someone else's obligations.

Example simulated checkout request:

```json
{
  "amount": "4000.00",
  "paymentType": "COMBINED",
  "type": "EWALLET",
  "provider": "GCash",
  "idempotencyKey": "a-unique-request-uuid",
  "relatedUtilityStatementId": null
}
```

For a received payment recorded by an administrator, use `type: "MANUAL"` and one of `Cash`, `GCash`, `Maya`, `Bank Transfer`, `Card`, or `Other` as provider. This records funds already received; it never collects funds. Saved methods remain snapshots, not gateway tokens.

Utilities may target one statement or all unpaid statements. If multiple statements receive funds, each ID/period is retained in `allocations[]`. Duplicate identical utility submissions return the existing statement without another charge or notification. Changed statements preserve the earlier revision, and cannot reduce charges below amounts already paid.

## 5. Frontend changes

- Tenant Billing displays Outstanding Rent, Outstanding Utilities, Total Outstanding, rent periods/status/due dates, itemized current and historical utility statements, total recorded paid, and allocated payment history.
- Payment form offers Rent / Utilities / Both, partial amount, optional utility statement, and selected payment method. The server calculates actual allocations.
- Checkout and receipts clearly state **Demo / Simulated Payment** and that no money is transferred. Removed forced GCash failure and misleading gateway/auto-pay claims.
- Admin tenant profile now contains a billing workbench: reconciliation, rent issuance, utility Present Bill/reissue, received-payment recording, and history.
- Admin and tenant history show date, reference, method, type, amount, both allocations, status, and simulation labeling. Unknown legacy allocations are explicitly marked.
- Tenant dashboard uses the same derived ledger balances, without hiding charges until a week before the due date.
- Removed placeholder invoice/cloud-sync buttons that only changed local labels. Rent issuance is explicitly manual.
- The unused legacy TenantFinancial entry point now delegates to the real tenant billing workbench rather than referencing mock generic balances. The demo seeder no longer invents rent payments or payment notifications.

## 6. Migration / rollout

**Back up MongoDB before deployment. Stop the old backend before starting this version; do not run old writable billing code alongside Model B. Deploy the matching frontend and backend together.**

Existing records are safely marked for reconciliation on their first billing read. The conditional migration adds a version and review flag, and copies the old tenant balance as evidence; it does not guess how much was rent, utilities, or already paid. During review, authoritative balances are returned as null, the UI says review required, and new charges/payments are blocked. This avoids silently treating an overwritten rent balance as zero.

For every existing tenant:

1. Open Tenant Management → tenant profile → Review legacy billing.
2. Compare preserved legacy amounts, available utility breakdown, receipts, and external source records.
3. Add each verified opening rent period with original charge, previously paid amount, and due date.
4. Add each verified opening utility period with its itemized charges, previously paid amount, and due date. Add multiple periods if needed.
5. Enter the evidence/audit note and explicitly confirm the opening balances. An empty list explicitly means no opening obligations of that kind.
6. Check both portals and a known statement/payment before allowing ongoing billing.

This retains old transactions without inventing historical allocations or manufacturing payments for opening balances. Historic bills already overwritten by the old implementation cannot be reconstructed automatically; use backups or original statements. Reconciled utility statements are labeled as opening records when historic meter readings are unavailable.

New tenant registration starts directly in Model B with an initial rent obligation using the existing first-rent-due convention. Subsequent rent periods are issued manually from the tenant profile.

The model declares a unique tenantId index, but the existing application's automatic index creation is not enabled. New ledger IDs are deterministic per tenant, preventing duplicate new-ledger creation. For deployment, audit existing billing documents for duplicate tenant IDs and create the unique index after resolving any duplicates; never drop a billing document merely to make an index succeed. No live migration or index changes were executed during this implementation.

## 7. Automated tests

Final verification on September 28, 2026: **54 backend tests passed, 22 frontend tests passed, production Vite build passed, and git diff whitespace checks passed.** All seven required accounting scenarios are covered. No live database migration or payment was performed.

Backend tests include all seven requested cases: utility generation preserves rent; rent-only payment; utility-only payment; combined allocation; full settlement; new-period preservation and notification; duplicate payment protection. Additional tests cover invalid/overpaid amounts, precision, selected statements, already-paid statements, overdue ordering, explicit reissue/revision conflicts, preservation of allocated payments, legacy blocking, GCash simulation, missing tenants, optimistic concurrency, single-document commit boundaries, persistence failures, explicit reconciliation, archived history, Mongo decimal/legacy conversion, and notification retry behavior.

Frontend component tests verify separate balance labels, unknown legacy values, transaction allocations, statement history, payment choices, and explicit simulated receipts. Existing ticket-analysis tests remain in the suite.

Tests use pure accounting fixtures, mocked repositories, the actual Mongo mapping converter, and server-rendered React components. They do **not** contact a live payment provider or change a live MongoDB database. A live browser-to-Mongo smoke test remains a deployment check.

## 8. Exact run/test commands

Prerequisites: Node/npm, Java 17+, Maven, and configured MongoDB. Existing backend configuration reads `server/.env`; use the project's existing MongoDB/JWT/CORS settings. Do not replace production credentials with demo defaults.

Frontend terminal:

```powershell
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project'
npm run dev
```

Backend terminal:

```powershell
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project\server'
mvn spring-boot:run
```

Normal test/build commands:

```powershell
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project'
npm test
npm run build
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project\server'
mvn test
```

Direct equivalents used in this workspace (existing local dependencies/cache):

```powershell
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project'
node --test src/utils/ticketReports.test.js src/utils/triageStats.test.js src/components/billing/BillingDetails.test.js
node node_modules/vite/bin/vite.js build
Set-Location 'C:\Users\ymnis\Documents\SiraNaBa_Project\server'
mvn -o "-Dmaven.repo.local=C:\Users\ymnis\.m2\repository" test
```

## 9. Remaining limitations

- There is no live payment gateway. Tenant checkout intentionally records **simulated** payments and reduces the selected demo ledger obligations. It must not be used as proof of actual funds collected. History explicitly distinguishes it from management-recorded receipts.
- Rent-period issuance is manual after registration. There is no automated rent-roll scheduler, auto-pay, refund/reversal, overpayment credit, or payment-gateway settlement reconciliation.
- Electricity's server reference rate must be maintained when rates change; no live provider feed exists.
- Old overwritten charges/statements and missing allocations require human reconciliation using authoritative records.
- Notifications are eventually delivered (normally within the dispatch interval of 15 seconds plus processing time); delivery outages do not invalidate successful payments.
- Embedded histories are subject to MongoDB's 16 MB document limit. For very high transaction volumes, plan a tested archival/transactional partitioning strategy before approaching that limit. Do not prune history or idempotency records casually.
- A staging/live MongoDB end-to-end smoke test and backup/restore verification are still required before production rollout.

## 10. Complete file manifest for this billing change

Pre-existing unrelated workspace changes are not included here.

### Backend production files

- `server/src/main/java/com/siranaba/backend/bootstrap/DataSeeder.java`
- `server/src/main/java/com/siranaba/backend/controller/AdminTenantController.java`
- `server/src/main/java/com/siranaba/backend/dto/AdminPaymentResponse.java`
- `server/src/main/java/com/siranaba/backend/dto/AdminTenantResponse.java`
- `server/src/main/java/com/siranaba/backend/dto/PayRequest.java`
- `server/src/main/java/com/siranaba/backend/dto/PaymentReceipt.java`
- `server/src/main/java/com/siranaba/backend/dto/PresentBillRequest.java`
- `server/src/main/java/com/siranaba/backend/dto/PresentBillResponse.java`
- `server/src/main/java/com/siranaba/backend/dto/ReconcileBillingRequest.java` (new)
- `server/src/main/java/com/siranaba/backend/dto/TenantPaymentsResponse.java`
- `server/src/main/java/com/siranaba/backend/exception/GlobalExceptionHandler.java`
- `server/src/main/java/com/siranaba/backend/model/Billing.java`
- `server/src/main/java/com/siranaba/backend/model/Tenant.java`
- `server/src/main/java/com/siranaba/backend/service/AdminPaymentService.java`
- `server/src/main/java/com/siranaba/backend/service/AdminTenantService.java`
- `server/src/main/java/com/siranaba/backend/service/BillingAccounting.java` (new)
- `server/src/main/java/com/siranaba/backend/service/BillingLedgerService.java` (new)
- `server/src/main/java/com/siranaba/backend/service/BillingNotificationDispatcher.java` (new)
- `server/src/main/java/com/siranaba/backend/service/BillingService.java`
- `server/src/main/java/com/siranaba/backend/service/DashboardService.java`
- `server/src/main/java/com/siranaba/backend/service/PaymentReferences.java`
- `server/src/main/java/com/siranaba/backend/service/TenantRegistrationService.java`

### Backend tests (new)

- `server/src/test/java/com/siranaba/backend/service/AdminBillingServiceTest.java`
- `server/src/test/java/com/siranaba/backend/service/BillingAccountingTest.java`
- `server/src/test/java/com/siranaba/backend/service/BillingLedgerServiceTest.java`
- `server/src/test/java/com/siranaba/backend/service/BillingMongoMappingTest.java`
- `server/src/test/java/com/siranaba/backend/service/BillingNotificationDispatcherTest.java`

### Frontend

- `src/api/endpoints.js`
- `src/components/billing/AdminBillingPanel.jsx` (new)
- `src/components/billing/BillingDetails.jsx` (new)
- `src/components/billing/BillingDetails.test.js` (new)
- `src/components/billing/PaymentParts.jsx`
- `src/context/TenantRegistryContext.jsx`
- `src/pages/Billing.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/admin/TenantManagement.jsx`
- `src/pages/admin/TenantFinancial.jsx`
- `package.json`

### Documentation

- `docs/MODEL_B_BILLING.md` (new)
- `server/README.md`
