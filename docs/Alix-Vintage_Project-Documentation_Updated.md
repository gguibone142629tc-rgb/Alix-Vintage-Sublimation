UM TAGUM COLLEGE
BACHELOR OF SCIENCE IN COMPUTER SCIENCE
Department of Computing Education
Visayan Village, Tagum City, Philippines


Course Requirements
in
CS 17/L
Software Engineering 2


Alix Vintage: Online Sublimation Ordering and Production Management System


Submitted to:
IRIS MAE MENDOZA, MIT

Submitted by:
GLENER A. GUIBONE
EMMANUEL M. MARTOS
JEHOZAPHAT EMMANUELL G. MABANSAG
JACOB GABRIEL A. DUMDUM


January, 2026


Table of Contents

TITLE PAGE
TABLE OF CONTENTS
A. BUSINESS REQUIREMENTS
   Business Profile
   Problem Statement
   Project Constraints
   Project Objectives
   Project Scope Statements
   Business Process Analysis
   Stakeholder Analysis
B. USER REQUIREMENTS
C. SYSTEM REQUIREMENTS SPECIFICATION
   C.1. Functional Requirements
   C.2. Non-functional Requirements
D. ACTIVITY DIAGRAM
E. USE CASE DIAGRAM
F. CONTEXT FLOW DIAGRAM
G. LEVEL-0 DATA FLOW DIAGRAM
H. SOFTWARE PROCESS MODEL


BUSINESS REQUIREMENTS


Business Profile

Alix Vintage is a local enterprise based in Tagum, specializing in custom sublimation printing. The brand has built a strong presence through social media commerce, but its success has exposed a significant operational bottleneck. Currently, the business relies on a "conversational commerce" model where every inquiry, design modification, and order detail is handled manually through Facebook Messenger. This labor-intensive process has reached a saturation point. To grow, Alix Vintage requires a digital platform that bridges the gap between browsing and final ordering, automating the collection of design specifications while maintaining the personal touch of their existing Facebook-based fulfillment.


Problem Statement

Managing bulk orders for large organizations via manual chat leads to significant data fragmentation. Capturing dozens of names, numbers, and sizes in a disjointed message thread often results in production errors, misprinted jerseys, and financial losses due to "joy buyers." The business requires a centralized web platform to enforce structured data collection and secure legal commitment from customers before manufacturing begins.


Project Constraints

Budget: This project is being developed without a formal financial budget, as it is an academic requirement for the Software Engineering 2 (CS 17/L) course. The proponents will utilize open-source tools and free hosting tiers to minimize costs.

Schedule: The development lifecycle—including analysis, design, implementation, and testing—must be strictly followed within the academic calendar, with a final completion and deployment deadline of May 31, 2026.

Resources: The project is constrained by a human resource limit of four members, assuming the specialized roles of two System Analysts, one Lead Programmer, and one UI/UX Designer.

Technology Stack: To ensure compatibility and ease of maintenance for the business owner, the development is limited to PHP, PostgreSQL, and standard HTML/CSS/JavaScript, avoiding complex frameworks that require high-level server configurations.


Project Objectives

Hybrid Product Pathing: To enable users to choose specific apparel types and seamlessly navigate between Fixed Catalog Designs (products) and Custom Design Uploads, both requiring an Admin-led approval workflow.

Email Identity Verification: To implement a mandatory email-based OTP (One-Time Password) confirmation system to verify customer accounts. The system delivers a 6-digit code to the user’s email using a configured mail transport (Gmail SMTP configuration is supported in deployment). This replaces the previous SMS/Semaphore OTP requirement.

Structured Roster & Asset Capture: To implement a mobile-responsive Roster Management tool that ensures high data accuracy for player names, sizes, and numbers, while providing a secure portal for logo and custom design uploads.

Unified Administrative Control: To implement a mandatory manual approval workflow for orders and custom requests, where the Admin confirms resource availability and provides/verifies the final quote and shipping fee before fulfillment proceeds.

Design Proofing Lifecycle: To implement a collaborative feedback loop where the Admin uploads digital layout mockups for customer review, requiring an electronic "Approve" or "Request Revision" action to move the order into production.

Flexible Payment Security: To establish a production gate requiring verification of customer payment evidence (e.g., GCash receipt uploads). The system supports staged payments (initial/partial and final where applicable) to protect the business before manufacturing and completion.

Real-Time Status Transparency: To provide a comprehensive tracking portal where customers can monitor their order through the system’s key stages. The backend order status values and user-friendly labels are aligned as follows: Pending (pending), Awaiting Payment (paid), Proofing (proofing), In Progress (processing), Awaiting Final Payment (awaiting_final_payment, when applicable), Ready to Ship (ready_to_ship), On Transit (shipped), Completed (completed).

External Logistics Integration: To provide a transparent tracking portal where customers can copy their J&T waybill number and utilize a one-click redirect to the official J&T Express tracking website for real-time updates.

Historical Record Maintenance: To provide a persistent digital archive of all completed and past transactions for both customers and administration.


Project Scope Statement

In Scope

User Authentication: Mandatory registration and secure login for all customers to access personal dashboards and order history.

Account Verification (Email OTP): Mandatory account activation using a 6-digit OTP (One-Time Password) sent via email during registration.

Hybrid Design Selection: A digital storefront allowing users to browse fixed catalog designs or utilize the Custom Design Upload feature for user-provided artwork or reference images with specific instructions.

Organization Roster Tool: A dynamic, mobile-responsive grid for accurate bulk entry of player names, jersey numbers, and sizes for team-based orders.

Admin-Managed Pricing & Shipping Fees: Pricing and shipping fees can be set/confirmed by the Admin when required. Shipping fee is Admin-decided for both fixed and custom orders. A business promo rule is applied: total quantity ≥ 10 qualifies for free shipping (shipping fee = 0).

Custom Asset Management: A secure file upload system for logos and custom design files tied directly to a specific order or request.

Design Proofing Lifecycle: A dedicated portal where the Admin uploads a digital mockup (Proof) and the customer must electronically click "Approve" or "Request Revision" to finalize the layout.

Admin Command Center: A private backend hub for reviewing rosters, managing custom design requests, setting quotes/shipping fees, uploading design proofs, verifying receipts, and managing the order lifecycle.

Customer Status Portal: A personal dashboard reflecting real-time status changes to reduce manual "Where is my order?" inquiries on Facebook.

Flexible Payment Gating: A verification workflow for uploaded receipts (e.g., GCash). The system supports staged payment handling where applicable (partial then final) before completion.

External Tracking Integration: A logistics feature where users can copy their J&T tracking number and click a button to redirect to the official J&T Express tracking website.

Order Archiving & History: A dedicated dashboard section for customers to view past order details, rosters, and design proofs, and a master archive for the Admin.

Out of Scope

Native Mobile Application: The system is strictly a web-based application; it is not available as a downloadable app from the Play Store or App Store.

Automated Third-Party Shipping APIs: The system does not feature direct technical integration (real-time automated updates) with couriers; tracking data is managed manually by the Admin.

Direct Online Payment Gateways: The system uses manual verification for receipts rather than a direct automated payment gateway.

In-Browser Graphic Design Editor: The system does not include a drag-and-drop graphic design editor. Customers upload reference images, and the final layout creation is performed offline by the artist.


Business Process Analysis

Current Process Issues

Labor-Intensive Inquiry Management: The business relies heavily on Facebook Messenger for every order inquiry, resulting in a repetitive cycle where each transaction requires a direct, one-on-one conversation to capture even the most basic order details.

Fragmented Information Tracking: Monitoring multiple orders simultaneously is a significant challenge because real-time updates are absent and critical customer data remains scattered across disjointed social media chat threads.

High Risk of Production Errors: Manually transcribing customization details such as names, numbers, and sizes from chat logs to a production list frequently leads to costly data entry mistakes and misprinted apparel.

Insecure Payment Verification: Tracking payment screenshots via chat is time-consuming and prone to human oversight, which often results in unpaid or unfulfilled orders due to the lack of a structured verification gate.

Logistics Communication Gaps: Customers must constantly message the business to check order progress, as there is no central system to provide tracking information, leading to repetitive "Where is my order?" inquiries.

Severe Operational Bottlenecks: The current conversational model makes it extremely difficult for the business to handle high volumes of orders, creating a ceiling that directly hinders the overall scalability of the enterprise.

Proposed Process Improvements

Unified Admin-Led Ordering: Replacing the repetitive, manual inquiry phase with a structured Digital Storefront where orders and custom requests undergo a clear review workflow.

Verified Customer Identity (Email OTP): Implementing email OTP verification at registration. This ensures every account is tied to a reachable email address, reducing fake registrations and helping mitigate "joy buyers." (This replaces the previous SMS/Semaphore OTP requirement.)

Self-Service Roster Accuracy: Enabling customers to input roster details (names, jersey numbers, sizes) into a structured grid to improve data accuracy.

Admin-Controlled Pricing & Shipping: Implementing an admin-controlled gate for pricing and shipping fees (Admin-decided), including support for promotional rules such as free shipping for qualifying bulk quantities.

Secure Payment Verification: Implementing a production gate where manufacturing only begins after the Admin verifies required payment evidence.

Collaborative Design Proofing: Introducing a digital "Design Proofing" stage where customers must Approve or Request Revision before production.

Granular Status Transparency: Providing a live tracking portal that provides real-time updates as the order moves through the system-defined stages.

Integrated Logistics Redirection: Allowing customers to copy the tracking number and redirect to J&T Express tracking.

Centralized Transaction Archiving: Transitioning from chat-based records to a persistent PostgreSQL database.


Stakeholder Analysis

Business Owner: Responsible for defining project goals and ensuring the platform eliminates operational bottlenecks in Tagum-based production.

Verified Customers: Team managers or individuals who verify their identity via email OTP, manage roster data, and interact with quoting and proofing workflows.

System Admin: The owner or staff who utilize the backend to review requests, set pricing/shipping, verify receipts, and manage the order lifecycle.

Development Team: Computer Science students from UM Tagum College responsible for the PHP/PostgreSQL implementation, email OTP delivery configuration (Gmail SMTP supported), and UI/UX design.

Stakeholders Needs

1. Business Owner Needs

Operational Efficiency: A platform that automates fixed design sales while streamlining custom upload requests through a unified admin review workflow.

Production Accuracy: A system that provides structured roster data to reduce misprints.

Financial Security: Verified accounts and payment verification gates to reduce business losses.

Quality Assurance: A formal design approval gate to ensure the customer confirms the layout before production.

2. Verified Customer Needs

Mobile-First Experience: A user-friendly, responsive interface optimized for smartphones.

Granular Status Visibility: Real-time updates across the lifecycle.

Design Input & Feedback: A structured way to upload reference images and provide feedback on layout proofs via Approve/Request Revision.

Simplified Fulfillment: Access to tracking number copy and courier redirect features once shipped.

3. System Admin Needs

Manual Quoting & Approval Tools: Tools to review incoming requests, confirm stock, and set production price and shipping fees.

Centralized Asset & Proof Management: A hub for customer uploads and proof publishing.

Payment Verification: A streamlined view to verify uploaded receipts.

Workflow Control: A dashboard to transition orders through the supported stages.

4. Development Team Needs

Clear Logic Flow: Defined rules for quoting, shipping fee decisions, and payment verification.

State Machine Management: Backend logic to handle order status transitions and the proof revision loop.

Email Delivery Stability: Reliable OTP delivery via configured email transport and a robust PostgreSQL schema.


USER REQUIREMENTS

Table 1. User Requirements(Admin - Internal User)

User Requirement No.
Category
Description

UR A1
Admin Authentication

a. Log in securely using encrypted credentials to access the backend management system.

UR A2
Order Management

a. Review submitted rosters and individual designs to ensure they are production-ready.
b. Review custom upload requests and provide a manual price quote and shipping fee when applicable.
c. Review fixed catalog orders and confirm material availability before fulfillment proceeds.
d. Upload digital design mockups (Proofs) for customer review.
e. Verify uploaded receipts for initial/partial payments and (when applicable) final payments.
f. Manually transition orders through the system-supported lifecycle stages (pending, paid, proofing, processing, awaiting_final_payment, ready_to_ship, shipped, completed, cancelled).
g. Input the J&T tracking number during the On Transit (shipped) phase.

UR A3
Item Management

a. Update the website showcase by adding new designs or toggling items as Out of Stock.

UR A4
Data Archiving

Access a master list of historical orders to support auditing and reporting.


Table 2. User Requirements(Customer - Verified User)

User Requirement No.
Category
Description

UR C1
Identity Verification

a. Receive and enter a 6-digit OTP via email during registration to activate the account.
b. Securely log in once the email has been verified.

UR C2
Personalization

a. Select apparel types and input bulk roster details (Names, Numbers, Sizes) via a dynamic grid (group orders).
b. Upload design files or reference images with specific details for custom-made orders.

UR C3
Transaction

a. Choose the preferred payment method available (e.g., GCash or COD based on policy).
b. Review and accept the Admin’s quote when manual quoting applies.
c. Approve the Admin’s design proof or request revision with specific feedback.
d. Upload payment receipts for verification when required.

UR C4
Order Tracking

a. Access a dashboard to view real-time order status.
b. Copy the J&T tracking number and redirect to the official J&T tracking site.

UR C5
Account History

a. View a chronological list of previous orders, including status, totals, and final approved designs.


SYSTEM REQUIREMENTS SPECIFICATION

Table 3. Functional Requirements (Admin)

Functional Requirement No.
Category
Description

FR A1
Product Management

a. Admin must be able to add, update, and delete apparel listings, including images and pricing.

FR A2
Order Review

a. Admin can view roster details or individual design details for pending orders/requests.
b. Admin must confirm stock availability and accept the request when required.
c. Admin must input or adjust base price and shipping fee where applicable.
d. Admin must be able to upload layout mockups for customer approval (proofing).

FR A3
Payment Verification

a. Admin must verify uploaded receipts based on workflow stage.
b. Production should not proceed unless required payments are verified according to policy.

FR A4
Fulfillment

a. Admin must transition orders to Ready to Ship once production is complete.
b. Admin must input a J&T tracking number and transition the status to On Transit once handed to the courier.


Table 4. Functional Requirements (Verified Customer)

Functional Requirement No.
Category
Description

FR C1
Email Verification

a. Users must receive and enter a 6-digit confirmation code via email to verify their account during registration.
b. Users must be able to request/resend a verification code.

FR C2
Product Pick

a. Users can select designs and choose group/individual paths where applicable.
b. Users must be able to upload custom files or reference pictures if selecting the Upload Own Design path.

FR C3
Roster Management

a. Users can input multiple names, numbers, and sizes via a responsive grid and upload a logo for the batch.

FR C4
Checkout & Obligation

a. Users must agree to the Terms and Conditions before submitting the order.
b. Users must upload required receipts and wait for Admin verification when applicable.
c. Proofing Gate: Users must click Approve or Request Revision on the layout proof before production begins.

FR C5
Status Monitoring

a. The system must provide a My Orders portal showing system-defined stages.
b. The portal must feature a copy button for tracking number and a link to the courier tracking website.

FR C6
History Retrieval

a. The system must query the database for records matching the user and display them in a Past Orders view.


Table 5. Non-functional Requirements

Non-functional Requirement No.
Category
Description

NFR 1
Performance

a. Website pages must load in under 3 seconds.

NFR 2
Usability

a. The website must follow a Mobile-First Design approach.

NFR 3
Security

a. Passwords must be hashed in the database.
b. Access to receipts, rosters, and custom design files must be restricted.

NFR 4
Compatibility

a. The website must be responsive on Android, iOS, and modern desktop browsers.

NFR 5
Reliability

a. The system must maintain proof version history and revision notes for each order item.


ACTIVITY DIAGRAM

Figure 1. Alix Vintage Sublimation: Activity Diagram

The activity diagram illustrates the structured workflow for the Admin and the Verified Customer, replacing fragmented chat-based ordering with a gated lifecycle.

Verified Customer Workflow

The journey begins with account registration and Email OTP verification. Once authenticated, the customer browses products and submits orders or requests:

Selection & Roster Input: The customer selects a product and (for group orders) completes roster inputs.

Request Gate: The customer submits the request/order and waits for Admin actions where required.

Payment & Receipt Upload: The customer uploads required receipts and waits for Admin verification.

Design Proofing Loop: The customer reviews the Admin’s proof and chooses Approve or Request Revision.

Tracking & Archiving: The customer monitors statuses until On Transit. Completed transactions remain accessible in order history.

Admin Workflow

The Admin acts as the decision gate:

Request Review: The Admin evaluates pending requests, confirms stock, and sets/adjusts pricing and shipping.

Payment Verification: The Admin verifies uploaded receipts.

Mockup Management: The Admin uploads proofs and responds to revision requests.

Order Fulfillment: The Admin transitions status to Ready to Ship and then On Transit after setting tracking.


USE CASE DIAGRAM

Figure 2. Alix Vintage Sublimation: Use Case Diagram Description

The Use Case Diagram illustrates interactions between two primary actors: Verified Customer and Administrator.

Verified Customer Use Cases

Register via Email OTP
Browse products
Input roster (group orders)
Upload design reference
Approve/Revise design proof
Upload payment receipt
Track order and view history

Administrator Use Cases

Authenticate login
Manage products
Review order/request and set quotes/shipping
Upload proofs
Verify receipts
Update status and tracking


CONTEXT FLOW DIAGRAM

Figure 3. Alix Vintage Sublimation: Context Flow Diagram Description

Verified Customer Information Flows

Input flows: registration data (email), OTP submissions, product selections, roster/customization data, design uploads, proof feedback, payment receipts.

Output flows: product data, OTP delivery via email, quotes/shipping confirmations when applicable, proofs, status updates, tracking number.

Administrator Information Flows

Input flows: order review decisions, quote/shipping updates, proof uploads, verification decisions, tracking updates.

Output flows: consolidated roster/asset data, receipt images, revision requests, dashboards.


LEVEL-0 DATA FLOW DIAGRAM

Figure 4. Alix Vintage Sublimation: Level-0 Data Flow Diagram

1.0 User Authentication & Email OTP: verifies accounts by sending and validating 6-digit OTP codes through the configured email transport.

2.0 Product Request & Roster Capture: captures product selections, quantities, and roster details.

3.0 Admin Review & Manual Quoting: admin confirms feasibility and sets quote/shipping where applicable.

4.0 Payment & Design Proofing Lifecycle: handles receipt uploads, verification, proof versions, and revision notes.

5.0 Production Tracking & Logistics: updates status through processing and shipping, stores tracking numbers.

6.0 Order History & Data Archiving: provides persistent retrieval of past transactions.


SOFTWARE PROCESS MODEL (METHODOLOGY)

Figure 5. Alix Vintage Sublimation: Waterfall Model

For the development of the Alix Vintage Sublimation website, the proponents adopted the Waterfall methodology. This model is linear and sequential, where progress flows through distinct phases.

This approach ensures that requirements for Email OTP Verification, Admin Review/Quoting, Design Proofing, and Payment Verification are fully understood before implementation.

Phases and Activities

1. Requirement Analysis

The team gathered requirements by analyzing the current Facebook-based ordering process. The identity verification requirement was implemented as email OTP (Gmail SMTP supported), replacing the original SMS/Semaphore OTP plan.

2. System and Software Design

The team designed the system architecture and PostgreSQL database schema for verified accounts, orders, roster data, proofs, and payments. UI was designed mobile-first.

3. Implementation / Coding

Module 1: Email OTP Verification (Gmail SMTP supported)
Module 2: Roster Management and uploads
Module 3: Quoting & Payment Verification Gate (receipt upload + verification)
Module 4: Design Proofing Portal (Approve/Request Revision)
Module 5: Order Tracking Dashboard (status updates + tracking copy/redirect)

Tools and Technologies Used:
Programming Languages: PHP, HTML, CSS, JavaScript
Database: PostgreSQL
Version Control: Git
Development Environment: Visual Studio Code

4. Testing

Unit testing and integration testing verify that roster data, receipt uploads, and design proofs flow correctly. Special focus is placed on revision loop behavior and payment verification gates.

5. Deployment

The system is deployed locally for demonstration. For production, environment variables are configured, PostgreSQL is provisioned, and mail transport is set to SMTP for OTP delivery.

6. Maintenance

Maintenance includes monitoring OTP email deliverability, updating tracking links if courier pages change, and ensuring database performance remains stable.