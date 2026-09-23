# SiraNaBa — Product Requirements Document

> **A clear plan for what we’re building, why it matters, and how we’ll make it happen.**

| | |
|---|---|
| **Product** | SiraNaBa Facility Maintenance Triage and Repair Management System |
| **Document** | Product Requirements Document (PRD) |
| **Version** | 1.0 |
| **Status** | Product definition based on the current SiraNaBa implementation and project specification |
| **Primary users** | Dormitory tenants, administrators/property managers, maintenance staff |
| **Platform** | Responsive web application |

---


## **01**  Product at a Glance

| **What** | **SiraNaBa** |
|---|---|
| **Core problem** | Fragmented maintenance reporting, manual triage, disconnected administrative workflows |
| **Core solution** | One digital workflow for reporting, AI-assisted triage, dispatch, tracking, billing, payments, and notifications |
| **Primary value** | Better visibility, clearer status tracking, centralized operations, and faster identification of potentially urgent issues |
| **Core workflow** | **Report → Triage → Dispatch → Track → Resolve → Record** |

> **Product promise**  
> A tenant reports a problem once. SiraNaBa records it, evaluates its urgency, routes it into the appropriate operational workflow, keeps the tenant informed, and gives administrators a centralized view.

---

---


## **01**  Product Overview

SiraNaBa is a web-based facility and dormitory management platform designed to replace fragmented, manual maintenance reporting and administrative workflows with a centralized digital system.

The product combines:

- Tenant self-service
- Maintenance request submission
- AI-assisted maintenance severity triage
- Live repair/ticket tracking
- Staff dispatch and workload management
- Rent and utility billing
- Payment recording
- Notifications and alerts
- Tenant and staff administration
- Building/facility monitoring
- Administrative system and database monitoring

The core product idea is simple:

> A tenant reports a problem once, SiraNaBa records it, evaluates its urgency, routes it to the appropriate operational workflow, keeps the tenant informed, and gives administrators a centralized view of what is happening.

The project specification identifies the underlying problem as manual reporting through verbal communication, paper logs, message groups, and basic forms. These approaches can result in unorganized requests, miscommunication, delayed responses, and incorrect prioritization of safety-related problems.

SiraNaBa is intended to provide a practical digital workflow for small-scale residential/dormitory operations while serving as the software artifact evaluated by the research project.

---


## **02**  Why This Product Matters

### **2.1**  Problem

Dormitory maintenance issues such as leaks, electrical faults, damaged furniture, and other facility problems may be reported through informal channels. When several issues occur at once, administrators must manually interpret, record, prioritize, assign, and communicate each request.

This creates several operational problems:

1. Requests can be missed or forgotten.
2. Urgent hazards may not receive appropriate priority.
3. Tenants may not know the current status of their request.
4. Administrators lack a single operational view.
5. Staff assignments can become difficult to coordinate.
6. Billing and maintenance information can become fragmented.
7. Manual processes do not scale efficiently as the number of tenants and requests grows.

The project specification specifically identifies a technology gap around automatically categorizing and prioritizing maintenance problems for small residential facilities.

### **2.2**  Product opportunity

SiraNaBa provides one system where maintenance, tenant administration, billing, payments, notifications, and staff operations can be managed through connected workflows.

The project also explores AI-assisted hazard assessment so that a new maintenance ticket can receive a severity assessment without requiring an administrator to manually perform the initial classification.

### **2.3**  Intended impact

The intended operational impact is to:

- Reduce manual maintenance logging.
- Improve visibility into active problems.
- Surface potentially dangerous maintenance requests quickly.
- Give tenants clearer status information.
- Centralize tenant, billing, staff, and maintenance information.
- Improve operational coordination.
- Provide measurable data for evaluating response time, throughput, scalability, and reliability.

The research specification connects the project to **SDG 11: Sustainable Cities and Communities**, specifically Target 11.1 concerning adequate, safe, and affordable housing and basic services.

---

# 3. Product Vision

## Vision

**Create a practical digital control center for small residential facilities where maintenance issues, tenant services, billing, payments, staff dispatch, and notifications are managed through one responsive platform.**

## Product principle

Every important operational event should become visible, traceable, and actionable.

For maintenance, this means:

**Report → Triage → Prioritize → Assign → Work → Resolve → Notify → Record**

For billing, this means:

**Bill → Present → Pay/Record → Update Balance → Notify → Preserve Transaction History**

---

# 4. Product Goals

## 4.1 Primary goals

### Goal 1 — Digitize maintenance reporting

Allow tenants to submit structured maintenance requests with:

- Category
- Title
- Detailed description
- Location
- Optional photos/evidence

### Goal 2 — Provide automated severity assessment

Use Google Gemini for AI-assisted ticket triage when configured.

The triage process is intended to assess:

- Severity/priority
- Safety note
- Estimated completion time

A fallback keyword-based heuristic exists when Gemini is not configured, allowing development and demonstrations to continue.

### Goal 3 — Improve maintenance visibility

Provide tenants and administrators with ticket status and operational information, including:

- Submitted
- Assigned
- In Progress
- Resolved
- Cancelled

### Goal 4 — Centralize tenant management

Allow administrators to:

- View tenants
- Register tenants
- Edit tenant profiles
- Track payment status
- Remove tenants
- Keep tenant records synchronized with the tenant portal

### Goal 5 — Centralize billing and payments

Provide tenant billing information and administrative payment workflows, including rent and utility information and transaction history.

### Goal 6 — Coordinate maintenance staff

Provide staff management, ticket assignment, dispatch status, and workload-related operational functionality.

### Goal 7 — Keep users informed

Provide notifications for relevant payment, maintenance, and community/facility events.

### Goal 8 — Provide measurable system performance

Evaluate the platform using measurable indicators such as:

- End-to-end latency
- Throughput
- Resource utilization
- Scalability
- Reliability
- Fault tolerance

---

# 5. Users and Roles

## 5.1 Tenant

A resident/tenant using SiraNaBa to manage their housing-related interactions.

### Tenant needs

- View account information.
- View current balance.
- View utility usage/billing information.
- View payment history.
- Submit maintenance requests.
- Attach supporting evidence.
- Track repair progress.
- View assigned specialist information where available.
- Receive notifications.
- Mark notifications as read.
- Update profile information.
- Sign out securely.

---

## 5.2 Administrator

The property/dormitory operator responsible for tenant, maintenance, billing, staff, and system operations.

### Administrator needs

- View operational dashboard.
- Manage tenants.
- Register tenants.
- Edit tenant information.
- Record/confirm payments.
- Present bills.
- Manage staff.
- Review maintenance tickets.
- Triage and dispatch maintenance requests.
- Monitor facility/IoT emergency information.
- Review system/database status.
- Manage operational configuration.

---

## 5.3 Maintenance Staff / Specialist

A person responsible for resolving maintenance work.

### Staff needs

- Receive assigned work.
- View ticket information.
- Understand severity and safety information.
- Update dispatch/work status.
- Track workload.
- Complete assigned maintenance work.

The exact staff-facing permissions and UI should remain aligned with the current implementation and should not be expanded beyond the supported backend behavior without a separate requirement.

---

# 6. Product Scope

## 6.1 In scope

### Tenant portal

- Authentication
- Dashboard
- Tenant profile/settings
- Maintenance request submission
- Maintenance ticket list
- Maintenance ticket detail
- Live ticket status tracking
- Billing and payments
- Notifications
- Notification preferences/UI
- Payment history
- Utility information

### Admin portal

- Admin authentication
- Command Center/dashboard
- Tenant Management
- Tenant registration
- Tenant profile editing
- Tenant financial/payment management
- Staff Management
- Triage and Dispatch
- Facility/IoT Emergency view
- Configuration/system monitoring
- Database status monitoring

### Backend

- Spring Boot REST API
- MongoDB persistence
- JWT-based authentication
- Tenant/admin access control
- Ticket management
- Billing management
- Payment management
- Staff management
- Notification management
- AI triage integration
- Audit logging
- Email integration where configured
- Database status reporting

---

## 6.2 Out of scope unless separately approved

The current project materials do not establish these as committed product requirements:

- Native iOS application
- Native Android application
- Full external payment gateway settlement
- Automated bank reconciliation
- Full accounting/ERP functionality
- Predictive maintenance based on production IoT data
- Multi-property enterprise management
- Public tenant self-registration
- Guaranteed SMS delivery
- Guaranteed push-notification infrastructure
- Autonomous physical maintenance robots
- Fully autonomous AI decision-making without human operational oversight

These may be future opportunities, but they should not be treated as MVP requirements.

---

# 7. Current Product Structure

The existing frontend identifies six primary tenant-facing screens:

1. Dashboard / Home
2. Maintenance & Live Ticket Tracking
3. Submit Maintenance Request
4. Billing & Payments Center
5. Notification Center
6. Administrative Sign-In

The repository also contains administrative screens for:

1. Command Center
2. Tenant Management
3. Tenant Financial
4. Staff Management
5. Triage & Dispatch
6. Configuration
7. IoT Emergency

---

# 8. Functional Requirements

## **FR-001**  Authentication

The system shall provide secure authentication for protected application functionality.

#### ▸ Requirements
- User submits email and password.
- Backend validates credentials.
- Passwords are stored as bcrypt hashes.
- Successful login creates an HTTP-only JWT session cookie.
- Protected API routes require an authenticated session.
- Logout clears the session cookie.
- Unauthorized requests receive an appropriate authentication response.
- Tenant portal routes redirect unauthenticated users to login.

#### ▸ Acceptance criteria
- A valid account can sign in.
- Invalid credentials do not create a session.
- Protected API requests fail when unauthenticated.
- Logout invalidates the active session.
- Passwords are never stored in plaintext.

---

# 9. Tenant Dashboard

## **FR-010**  Dashboard summary

The tenant dashboard shall provide an at-a-glance view of important account and facility information.

The current implementation includes:

- Current balance
- Active tickets
- Utility usage
- Recent activity

The dashboard should allow the tenant to quickly understand:

1. Whether money is currently owed.
2. Whether maintenance work is active.
3. Whether there are relevant recent events.
4. Whether there are utility-related details requiring attention.

---

# 10. Maintenance Request Management

## **FR-020**  Submit maintenance request

A tenant shall be able to create a maintenance request.

#### ▸ Required information
- Request category
- Summary title
- Detailed description
- Location

#### ▸ Optional information
- Photos
- PDF evidence/attachments

The current UI limits attachments to up to five photos or PDFs.

#### ▸ Submission workflow
The current tenant workflow is:

**Step 1 — Details**
- Select category
- Enter title
- Enter description
- Add optional evidence

**Step 2 — Location**
- Enter issue location

**Step 3 — Review**
- Confirm request before submission

#### ▸ Validation
The system shall prevent submission when required information is missing.

---

# 11. AI Hazard Triage

## **FR-030**  Automated ticket triage

When a tenant submits a maintenance ticket, the backend shall run the configured triage process.

#### ▸ Primary implementation
- Google Gemini
- `GeminiTriageService`

#### ▸ Expected triage output
- Severity/priority
- Safety note
- Estimated completion time

#### ▸ Priority representation
The current frontend recognizes at least:

- Severe
- Critical
- Other/non-urgent states

The exact complete priority taxonomy should be maintained from the backend implementation rather than invented separately.

#### ▸ Fallback behavior
When a Gemini API key is unavailable, the backend can use a keyword-based heuristic for development/demo operation.

The current fallback considers words such as:

- gas
- leak
- no heat

The fallback is not equivalent to the AI service and should be treated as a development resilience mechanism.

---

# 12. Maintenance Ticket Lifecycle

A maintenance ticket shall have a visible operational lifecycle.

The current tenant UI uses:

1. **Submitted**
2. **Assigned**
3. **In Progress**
4. **Resolved**

A ticket may also become:

- **Cancelled**

### Ticket detail information

The tenant ticket detail view supports information such as:

- Ticket ID
- Title
- Current stage
- Priority/severity
- Specialist information
- Timeline
- Attachments
- Live status indication
- Ticket cancellation
- Additional attachments

#### ▸ Acceptance criteria
A tenant should be able to open a ticket and determine:

- What the request is.
- Where it was reported.
- Its current status.
- Whether it is considered urgent.
- Whether a specialist has been assigned.
- What has happened to the ticket over time.

---

# 13. Maintenance Dispatch

## **FR-040**  Administrative triage and dispatch

Administrators shall be able to review maintenance requests and coordinate their assignment to staff.

The backend contains dedicated services/controllers for:

- Ticket management
- Ticket triage
- Ticket dispatch
- Dispatch status updates
- Staff workload reconciliation

#### ▸ Intended workflow
**New Ticket**
→ **Severity Assessment**
→ **Administrative Review**
→ **Staff Assignment**
→ **Dispatch**
→ **In Progress**
→ **Resolved**

For critical situations, the intended system behavior includes immediate alerting/dispatch behavior.

---

# 14. Staff Management

## **FR-050**  Staff management

Administrators shall be able to manage staff records.

The current backend supports:

- Create staff
- Update staff
- Delete staff
- Retrieve staff

The system also includes staff workload reconciliation functionality.

#### ▸ Staff information
The exact fields should follow the existing `Staff` model and DTOs in the repository.

The PRD should not introduce additional mandatory staff attributes until they are explicitly approved.

---

# 15. Billing and Utility Management

## **FR-060**  Billing

The system shall provide tenants with centralized billing information.

The current product includes:

- Current balance
- Utility breakdown
- Transaction history
- Payment information

The backend contains a `Billing` model and `UtilityUsage` model.

#### ▸ Utility billing
Utility usage is represented as part of the billing workflow.

The project requirements also establish utility billing breakdown as a core system objective.

#### ▸ Administrative billing
The admin portal includes tenant financial/payment functionality.

Administrators can manage payment status and record payments through the backend.

---

# 16. Bill Presentation

## **FR-061**  Present Bill

The backend includes a `PresentBillRequest` and `PresentBillResponse`, establishing a bill-presentation workflow.

The bill presentation flow should allow an administrator to prepare/present a tenant's current charges and make those charges visible in the tenant's billing experience.

The exact pricing rules and charge formulas must remain synchronized with the implemented billing service and unit-pricing rules.

---

# 17. Payment Management

## **FR-070**  Payment recording

The system shall maintain payment information associated with tenant billing.

The backend contains:

- Payment request/response DTOs
- Admin payment controller/service
- Payment provider abstraction
- Payment reference functionality
- Tenant payment history

The current admin workflow supports marking a tenant as paid.

When an administrator marks a tenant as paid:

1. The tenant balance is cleared.
2. A transaction is added to billing history.
3. A notification is sent to the tenant.

This should remain an auditable operation.

---

# 18. Notifications

## **FR-080**  Notification Center

Tenants shall have a centralized notification center.

Current categories include:

- Payments
- Maintenance
- Community

The notification center supports:

- All alerts
- Unread
- Category filtering
- Search
- Pagination
- Mark individual notification as read
- Mark all notifications as read
- Alert settings UI

The current UI exposes channel preferences for:

- Email
- SMS
- Push

These preferences should not be interpreted as proof that all three delivery infrastructures are currently implemented.

---

# 19. Tenant Management

## **FR-090**  Tenant management

Administrators shall be able to manage tenant records.

#### ▸ Required administrative capabilities
- View tenant list
- Open tenant profile
- Register tenant
- Edit tenant information
- Remove tenant
- View payment status
- View occupancy/account information

#### ▸ Registration
The current backend registration flow:

1. Creates a tenant record.
2. Creates a tenant login.
3. Determines rent server-side from unit type.
4. Generates initial credentials.
5. Attempts to email login information when email configuration is available.

The monthly rent should remain server-controlled rather than being trusted from client input.

---

# 20. Tenant/Admin Data Synchronization

Tenant data is shared between the tenant and admin portals.

There should be one authoritative tenant record in MongoDB.

Changes made through:

- Tenant Account Settings
- Admin Tenant Management

must update the same tenant record.

The current frontend periodically refreshes relevant data and refreshes again when the browser tab regains focus.

This is important because it prevents the tenant and admin portals from maintaining separate conflicting copies of tenant data.

---

# 21. System Configuration and Database Monitoring

## **FR-100**  Administrative system monitoring

The Configuration area provides operational information about the MongoDB database.

The current backend can report:

- Database status
- Database name
- Host names
- Server version
- Ping latency
- Data size
- Storage size
- Index size
- Server uptime when available
- Collection document counts

The connection string itself must never be returned to the frontend.

If MongoDB is unavailable, the system should report an offline state rather than exposing sensitive connection information.

---

# 22. IoT / Emergency Monitoring

The project specification describes a future/target event workflow involving sensor telemetry such as:

- Smoke triggers
- Water-leak triggers

The intended conceptual flow is:

**Sensor Event**
→ **Event Processing**
→ **Hazard Evaluation**
→ **Emergency Alert**
→ **Maintenance Dispatch**
→ **Dashboard Update**

The current repository contains an IoT Emergency administrative screen and related architectural concepts, but the project documentation contains inconsistencies between the intended Kafka/event-driven architecture and the currently implemented synchronous REST backend.

Therefore, IoT event streaming should be treated as an architecture/evaluation target unless the corresponding production implementation is explicitly completed.

---

# 23. Non-Functional Requirements

## **NFR-001**  Performance

The system should remain responsive under concurrent maintenance, payment, and notification activity.

The research specification proposes load and stress testing using event rates from approximately **10 to 500 events per second**.

Performance should be measured using:

- End-to-end latency
- Throughput
- CPU utilization
- Memory utilization

---

## **NFR-002**  Scalability

The system should be evaluated for its ability to maintain acceptable responsiveness as concurrent event producers increase.

Testing should examine:

- Increasing tenant activity
- Increasing maintenance requests
- Increasing sensor events where implemented
- Increasing consumer/service workload

---

## **NFR-003**  Reliability

The system should handle failures gracefully.

The research specification proposes testing:

- Consumer/service crashes
- Broker failures in an event-driven implementation
- Message retention
- Event replay
- Recovery behavior

For the current REST implementation, equivalent service/database failure scenarios should be tested against the components that actually exist.

---

## **NFR-004**  Security

The system shall:

- Use authenticated sessions for protected API routes.
- Store passwords using bcrypt hashing.
- Use HTTP-only JWT cookies.
- Enforce role-based authorization for administrative endpoints.
- Avoid exposing database credentials.
- Validate request input.
- Restrict access to tenant-specific information.
- Protect administrative functionality from tenant users.
- Avoid exposing secrets through frontend code.

---

## **NFR-005**  Responsiveness

The frontend shall support desktop and narrow-screen layouts.

The existing implementation includes:

- Responsive sidebar/drawer behavior
- Responsive grids
- Keyboard focus states
- Minimum comfortable interaction targets

---

## **NFR-006**  Maintainability

The application should preserve clear separation between:

- Frontend presentation
- API client
- Controllers
- Services
- Data models
- Repositories
- Authentication/security
- External AI integration

---

# 24. Technical Architecture

## Current implemented architecture

The repository currently implements:

### Frontend

- React 18
- React Router
- Tailwind CSS
- Vite

### Backend

- Java
- Spring Boot
- Maven
- Spring Data MongoDB

### Database

- MongoDB

### Authentication

- JWT
- HTTP-only cookie
- Spring Security
- bcrypt password hashing

### AI

- Google Gemini
- `GeminiTriageService`

### Development

- Visual Studio Code
- Git/GitHub
- Docker
- Railway is identified in the research documentation as a CI/CD/deployment tool

---

# 25. Important Architecture Clarification

The project specification describes an Event-Driven Architecture using:

- Apache Kafka
- Node.js consumers
- Python AI hazard service
- MongoDB event store

However, the current repository implementation does **not** fully match that architecture.

The current backend README and source code show:

- Spring Boot backend
- Synchronous REST APIs
- MongoDB
- Gemini triage
- Java service classes
- No active Kafka broker in the current backend implementation
- No separate Python hazard service in the current repository

The research document itself contains an internal inconsistency: one section states that the event broker is absent and the system uses synchronous REST APIs, while another describes a Kafka-based `ticket_submitted` event workflow.

### Product requirement decision

For implementation planning, treat the **current repository architecture as the implementation baseline**.

Treat Kafka/event-driven processing as a **research/architecture target or future implementation phase**, unless the team explicitly decides to migrate the current backend.

This distinction prevents the PRD from promising architecture that the existing product does not currently implement.

---

# 26. Core Data Model

The backend currently defines models including:

- `User`
- `Tenant`
- `Ticket`
- `Billing`
- `UtilityUsage`
- `Staff`
- `NotificationDoc`
- `Attachment`
- `TimelineEvent`
- `ActivityItem`
- `AuditLog`
- `ScheduledMaintenance`
- `Specialist`
- `Cta`
- `ManagementTool`

These models indicate that the system is intended to preserve operational history rather than treating the application as a collection of temporary UI states.

---

# 27. Key API Areas

The current backend exposes API areas including:

### Authentication

- `POST /api/auth/login`
- `POST /api/auth/logout`

### Tenant

- `GET /api/tenant`
- `PATCH /api/tenant`

### Dashboard

- `GET /api/dashboard/summary`

### Tickets

- `GET /api/tickets`
- `GET /api/tickets/categories`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id`

### Billing

- `GET /api/billing`

### Notifications

- `GET /api/notifications`
- `POST /api/notifications/mark-all-read`
- `PATCH /api/notifications/:id/read`

### Administration

The repository additionally contains dedicated controllers for:

- Admin payments
- Admin system/database status
- Admin tenants
- Admin tickets
- Staff

The exact endpoint contract should remain defined by the backend controllers/DTOs and frontend `endpoints.js`.

---

# 28. Primary User Workflows

## Workflow A — Tenant submits a maintenance request

1. Tenant signs in.
2. Tenant opens Maintenance.
3. Tenant selects Submit Request.
4. Tenant chooses a category.
5. Tenant enters title.
6. Tenant describes the problem.
7. Tenant optionally attaches evidence.
8. Tenant provides location.
9. Tenant reviews the request.
10. Tenant submits.
11. Backend creates the ticket.
12. AI triage determines severity when Gemini is configured.
13. Ticket becomes visible in maintenance tracking.
14. Appropriate administrative workflow begins.
15. Tenant receives relevant notifications.
16. Staff assignment and progress are reflected in ticket status.
17. Ticket is resolved or cancelled.

---

## Workflow B — Administrator registers a tenant

1. Admin signs in.
2. Admin opens Tenant Management.
3. Admin chooses tenant registration.
4. Admin enters tenant/unit information.
5. Backend validates the registration.
6. Tenant record is created.
7. Tenant login is created.
8. Rent is calculated server-side according to unit type.
9. Login details are emailed if email configuration exists.
10. Tenant appears in administrative and tenant-facing systems.

---

## Workflow C — Administrator records a payment

1. Admin opens tenant financial information.
2. Admin reviews outstanding balance.
3. Admin confirms payment.
4. Backend clears the balance.
5. Transaction is recorded.
6. Tenant is notified.
7. Dashboard/billing views reflect the updated balance.

---

## Workflow D — Tenant follows a maintenance ticket

1. Tenant opens Maintenance.
2. Tenant selects a ticket.
3. System displays ticket stage.
4. System displays severity where available.
5. System displays assigned specialist where available.
6. System displays timeline/history.
7. Tenant sees updated status as the ticket progresses.
8. Tenant can cancel eligible tickets.
9. Tenant can add/remove attachments where supported.

---

# 29. Product Success Metrics

The product should be evaluated using measurable indicators rather than subjective impressions.

## Operational metrics

- Average ticket processing latency
- Ticket triage latency
- Time from ticket creation to administrative visibility
- Time from ticket creation to dispatch
- Time to resolution
- Number of active tickets
- Number of overdue/unresolved tickets

## Billing metrics

- Payment recording accuracy
- Balance consistency
- Billing transaction integrity
- Utility calculation correctness

## AI triage metrics

- Severity classification accuracy
- Appropriate identification of high-risk tickets
- Triage response time
- Frequency of fallback classification
- Human/admin override rate, if implemented

## System metrics

- Requests/events processed per second
- End-to-end latency
- CPU utilization
- Memory utilization
- Failure recovery time
- Error rate
- Availability during testing

---

# 30. Testing Strategy

## 30.1 Functional testing

Verify:

- Authentication
- Authorization
- Tenant profile updates
- Tenant registration
- Ticket creation
- Ticket updates
- Ticket cancellation
- AI triage
- Staff management
- Billing
- Payments
- Notifications
- Database monitoring

---

## 30.2 Integration testing

Test interactions between:

- React frontend ↔ Spring Boot API
- Spring Boot ↔ MongoDB
- Spring Boot ↔ Gemini
- Authentication ↔ protected APIs
- Admin operations ↔ tenant portal
- Billing ↔ payment history
- Tickets ↔ notifications
- Tickets ↔ staff assignment

---

## 30.3 Load testing

The research methodology specifies synthetic workloads ranging from approximately:

**10 → 500 events per second**

Testing should measure:

- Latency
- Throughput
- CPU
- Memory
- Error rates

---

## 30.4 Stress testing

Simulate situations such as:

- Many tenants submitting tickets simultaneously
- Multiple urgent tickets arriving at once
- Simultaneous payment activity
- High notification activity
- Large numbers of concurrent API requests

---

## 30.5 Fault testing

Test:

- MongoDB unavailable
- Gemini unavailable
- Backend restart
- Invalid authentication
- Expired/invalid session
- Failed external email service
- Unexpected ticket update
- Database/network interruption

Where Kafka/event-driven functionality is eventually implemented, also test:

- Broker failure
- Consumer failure
- Message retry
- Dead-letter handling
- Message replay

---

# 31. Security and Privacy Requirements

## Authentication

- Passwords must never be stored in plaintext.
- Authentication cookies should be HTTP-only.
- Protected endpoints require valid authentication.
- Admin endpoints require administrator authorization.

## Data isolation

A tenant must only access their own:

- Profile
- Billing information
- Payment history
- Tickets
- Notifications

Administrators may access tenant information according to their authorized role.

## Sensitive configuration

The following must remain server-side:

- MongoDB connection string
- JWT secret
- Gemini API key
- Mail credentials
- Other private environment variables

Secrets must not be committed to source control.

---

# 32. UX Requirements

The interface should prioritize:

1. Clear status
2. Clear severity
3. Clear next action
4. Minimal unnecessary steps
5. Responsive layouts
6. Accessible interactive controls
7. Consistent visual language

### Critical maintenance information

When a ticket is classified as urgent, the UI should make the urgency visible without requiring the tenant or administrator to inspect several pages.

### Empty/error/loading states

Every major data-driven screen should provide:

- Loading state
- Empty state where applicable
- Error state
- Retry action where appropriate

The current tenant portal already uses loading/error patterns for several screens.

---

# 33. MVP Definition

The MVP should be considered complete when a tenant can:

- Sign in.
- View their dashboard.
- Submit a maintenance request.
- Receive a severity assessment.
- View the resulting ticket.
- Track its status.
- View billing information.
- View payment history.
- View notifications.
- Update their profile.
- Sign out.

And an administrator can:

- Sign in.
- View tenants.
- Register/edit/remove tenants.
- Manage staff.
- Review maintenance tickets.
- Assign/dispatch maintenance work.
- Manage payment status.
- Present/manage billing information.
- View notifications/operational alerts.
- Monitor system/database status.

---

# 34. Implementation Roadmap

## Phase 1 — Stabilize the existing product

### Objectives

Make the current application reliable from frontend to database.

### Work

- Confirm frontend build.
- Confirm Spring Boot startup.
- Configure MongoDB.
- Validate authentication.
- Validate tenant isolation.
- Remove obsolete mock dependencies.
- Confirm all frontend API calls match backend endpoints.
- Verify seed data behavior.
- Verify admin/tenant synchronization.

### Exit criteria

A complete tenant maintenance and billing flow works end-to-end against MongoDB.

---

## Phase 2 — Complete tenant operations

### Work

- Dashboard
- Maintenance list
- Ticket detail
- Ticket submission
- Ticket updates
- Billing
- Payment history
- Notifications
- Profile settings

### Exit criteria

A tenant can complete their core daily interactions without administrator intervention for basic information retrieval.

---

## Phase 3 — Complete administrator operations

### Work

- Command Center
- Tenant Management
- Tenant registration
- Tenant financial management
- Staff Management
- Triage & Dispatch
- Configuration
- IoT Emergency interface

### Exit criteria

An administrator can operate the facility's primary tenant, billing, staff, and maintenance workflows from the admin portal.

---

## Phase 4 — AI triage hardening

### Work

- Validate Gemini request/response handling.
- Validate malformed AI responses.
- Validate fallback behavior.
- Establish controlled severity categories.
- Log triage decisions.
- Record processing time.
- Provide safe handling for uncertain classifications.
- Define human override behavior if required.

### Exit criteria

AI triage produces consistent structured results and cannot prevent ticket creation when the AI provider is unavailable.

---

## Phase 5 — Performance and reliability evaluation

### Work

- Build synthetic workload generators.
- Run load tests.
- Run stress tests.
- Measure latency.
- Measure throughput.
- Measure CPU/memory usage.
- Test failure recovery.
- Compare against the defined baseline.

### Exit criteria

The project has reproducible performance results and documented limitations.

---

## Phase 6 — Event-driven architecture evaluation/migration

This phase should only proceed if Kafka/event-driven processing remains a required implementation objective.

### Potential work

- Introduce Apache Kafka.
- Define event schemas.
- Introduce producers/consumers.
- Separate maintenance, notification, accounting, and triage consumers.
- Introduce retry/dead-letter strategies.
- Introduce event replay.
- Measure event-processing latency and throughput.
- Compare synchronous REST behavior with the event-driven implementation.

### Important

This phase is distinct from stabilizing the current Spring Boot REST application. The current repository should not be described as fully Kafka-based until the migration has actually been implemented.

---

# 35. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI provider unavailable | Ticket triage may be delayed | Maintain fallback classification and allow ticket creation |
| Incorrect AI severity | Unsafe or inefficient prioritization | Preserve human/admin oversight and validate triage outputs |
| Database outage | Core application functions unavailable | Monitor database status and test recovery |
| Tenant data leakage | High security/privacy impact | Enforce authenticated tenant context and authorization |
| Billing inconsistency | Financial disputes | Keep billing as a centralized backend source of truth |
| Manual operational override | State inconsistencies | Record auditable status/payment changes |
| Architecture mismatch | Research claims may not match implementation | Clearly separate current implementation from event-driven target |
| High concurrent traffic | Slow response | Load/stress testing and performance profiling |
| Email configuration missing | Login credentials may not be delivered | Display admin notice and support configured email delivery |
| Demo/mock dependencies remain | Incorrect production behavior | Replace or explicitly label remaining mock-backed admin features |

---

# 36. Known Current-State Limitations

Based on the supplied project files, the product is not yet completely equivalent to the architecture described in the research specification.

Notable limitations include:

1. The current backend uses synchronous REST APIs.
2. Kafka is described in the research architecture but is not the active backend broker shown by the repository.
3. The research specification describes Node.js and Python consumers/services, while the current backend implementation is Java/Spring Boot.
4. Some administrative screens are still described by the frontend README as using `adminMockDb.js`.
5. The current tenant implementation is described as a single-tenant demo in one sense, despite administrative support for registering additional tenants.
6. IoT functionality is represented in the product/research direction but should not be assumed to be fully implemented merely because an IoT administrative screen exists.
7. Notification UI exposes channel preferences, but the supplied project files do not establish complete SMS/push delivery infrastructure.

These limitations should be documented rather than hidden because they directly affect implementation scope and research evaluation.

---

# 37. Definition of Done

A feature is considered complete when:

- The UI is implemented.
- The backend API exists where required.
- Data is persisted correctly.
- Authentication/authorization rules are enforced.
- Loading, error, and empty states are handled.
- Relevant audit/history information is preserved.
- The feature works against real MongoDB data.
- The feature does not depend on obsolete mock data unless explicitly documented.
- Integration testing passes.
- The feature works on supported responsive layouts.
- Relevant acceptance criteria are demonstrated.

---

# 38. Product Acceptance Criteria

The overall SiraNaBa product is ready for evaluation when the following end-to-end scenario succeeds:

### Tenant side

1. Tenant signs in.
2. Tenant views dashboard.
3. Tenant submits a maintenance request.
4. Request is persisted in MongoDB.
5. Triage assigns a severity or fallback severity.
6. Ticket appears in the maintenance list.
7. Tenant opens ticket detail.
8. Tenant sees its current stage and relevant severity information.
9. Tenant receives relevant notification.
10. Tenant views billing information.
11. Tenant views transaction history.
12. Tenant can update profile information.
13. Tenant signs out.

### Admin side

1. Administrator signs in.
2. Administrator views tenant records.
3. Administrator can register/edit a tenant.
4. Administrator views tenant financial information.
5. Administrator records/marks a payment.
6. Tenant balance updates.
7. Tenant receives a payment notification.
8. Administrator reviews maintenance tickets.
9. Administrator assigns/dispatches maintenance work.
10. Ticket status changes are reflected in the tenant portal.
11. Administrator manages staff.
12. Administrator can inspect system/database status.

### Evaluation

1. Functional tests pass.
2. Integration tests pass.
3. Load testing is completed.
4. Stress testing is completed.
5. Failure/recovery testing is completed.
6. Performance metrics are recorded.
7. Known limitations are documented.
8. Results can be compared against the chosen baseline.

---

# 39. Product Principles

SiraNaBa should be developed around the following principles:

### 1. One source of truth

Tenant, billing, ticket, staff, and notification data should have authoritative backend records.

### 2. Safety first

Potentially hazardous maintenance problems should be surfaced clearly and handled through an appropriate operational workflow.

### 3. Human oversight

AI assists triage; it should not be treated as an unquestionable replacement for responsible administrative decisions.

### 4. Traceability

Important actions should be recorded so that the history of a ticket, payment, or administrative operation can be understood.

### 5. Resilience

External service failures should not unnecessarily destroy core workflows.

### 6. Measurability

Performance claims should be supported by reproducible measurements.

### 7. Incremental architecture

The current working Spring Boot/MongoDB application should be stabilized before introducing architectural complexity such as Kafka-based event processing.

---

# 40. Summary

SiraNaBa is building a centralized facility management platform for small residential/dormitory environments.

The immediate product problem is operational: maintenance issues, tenant information, billing, payments, staff coordination, and notifications are difficult to manage when they depend on disconnected manual processes.

The product addresses that problem by providing:

**Tenant Portal + Admin Portal + Maintenance Workflow + AI Triage + Billing + Payments + Staff Dispatch + Notifications + Operational Monitoring**

The most important product workflow is:

**Tenant reports issue → system records request → AI-assisted triage evaluates severity → administrator/staff act → tenant tracks progress → issue is resolved and recorded.**

The product should be developed in stages. First stabilize and complete the current React + Spring Boot + MongoDB implementation. Then harden AI triage, complete administrative workflows, and perform systematic testing. If the research requires a true event-driven implementation, Kafka and separate consumers/services should be introduced as a deliberate architecture phase rather than being treated as already implemented.

The final goal is not simply to produce a collection of screens. It is to create a coherent operational system where important residential facility events become **visible, prioritized, actionable, trackable, and measurable**.
---

## **Product Definition Notes**

> **Source of truth:** This PRD describes the current SiraNaBa implementation and the project specification that informed it. Where the implementation and research architecture differ, the distinction is explicitly called out rather than silently reconciled.

> **Design direction:** This document uses the supplied reference as a visual guide: compact sections, strong numbered hierarchy, information-card tables, highlighted user needs, and feature/metric summaries.

