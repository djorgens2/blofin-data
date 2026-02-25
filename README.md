Security & Financial Instrument Management System

    Core Identity, RBAC, Data Processing, and Financial Instrument Lifecycle.



📌 Overview
This repository contains the backend systems for managing user identity, security roles, market data processing (ETL), and financial instrument configuration. It utilizes a robust persistence layer (#db) and cryptographic utilities to ensure data integrity and secure access control.
Key Functional Areas

    User Lifecycle Management: Handles authentication, account state transitions, and secure password hashing.
    RBAC (Role-Based Access Control): Manages hierarchical security roles and authorities.
    Market Data Pipelines: Scripts and utilities for loading, processing, and analyzing exchange data (e.g., BTC-USDT).
    Configuration & Testing: Comprehensive test suites and configuration files (fert.conf, tsconfig.json) for validation.

🛠 Project Structure
The project uses a structured approach, organizing code by concern (API, DB, Lib) and separating configuration/testing assets .
text

src/
├── api/                  # API utilities and interface definitions
│   ├── api.util.ts
│   └── index.ts
├── db/                   # Database interaction, models, and query utils
│   ├── index.ts
│   ├── query.utils.ts
│   ├── interfaces/
│   │   └── state.ts      # (e.g., TAccess, IAccess definitions)
│   ├── role.ts           # Role Identity Management (RBAC)
│   ├── role_authority.ts # Security Grid Mapping
│   └── user.ts           # User Lifecycle & Authentication
├── lib/                  # Shared utility functions
│   ├── app.util.ts
│   ├── crypto.util.ts    # Hashing, Salting, & Password Security
│   └── std.util.ts       # Equality checks & Validation
├── module/               # Core business logic modules
│   ├── fractal.ts
│   ├── order.ts
│   └── shutdown.ts
├── test/                 # Test cases for instruments, orders, etc.
│   ├── candles.ts
│   ├── leverages.ts
│   └── orders.ts
├── tsconfig.json         # TypeScript compiler configuration
├── package.json          # Dependencies and scripts
└── ... (various log files and documents)

Use code with caution.
🚀 Core API Usage Examples
The database models are designed for robust, type-safe operations.
Adding a Role (db/role.ts)
typescript

import { Add } from "#db/role";

await Add({
  title: "Viewer",
  auth_rank: 10
});

Use code with caution.
Logging In (db/user.ts)
The Login function handles validation and returns status-specific error codes:
typescript

import { Login } from "#db/user";

const result = await Login({ username: "user1", password: "rawPassword" });

if (result.error === 0) {
    console.log("Welcome,", result.username);
} else if (result.error === 301) {
    console.error("Account Disabled."); // Specific status code
}

Use code with caution.
🏗 Development & Testing
Data Schemas & ERDs
Key architectural diagrams and schemas are stored in the root documentation directory:

    db schema.ddl
    dh_erd.png
    db_erd_orders.png

Testing & Baselines
The fert framework is used for testing. Various baseline files (app-ca-la-baseline.xlsx, fert.conf) and test scripts (fert-cs-2a.ts) are used to ensure system behavior remains consistent .
To run tests, refer to the scripts defined in package.json.
📄 Documentation & License
All application code is documented using the TSDoc standard. Run npx typedoc to generate full project documentation.
© 2018-2026, Dennis Jorgenson.
All rights reserved.
