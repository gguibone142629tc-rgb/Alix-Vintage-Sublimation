# Database (PostgreSQL)

This folder contains the SQL schema for creating the database tables shown in the ERD.

## 1) Create database + user (optional but recommended)

Open **SQL Shell (psql)** or pgAdmin Query Tool and run:

```sql
CREATE USER app_user WITH PASSWORD 'change_me_strong';
CREATE DATABASE app_db OWNER app_user;
GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
```

## 2) Apply the schema

### Option A: Using `psql` (recommended)

From PowerShell:

```powershell
psql -h localhost -p 5432 -U app_user -d app_db -f "./server/src/infrastructure/db/schema.sql"
```

If `psql` isn’t found, open **SQL Shell (psql)** from the Start Menu, or add PostgreSQL `bin` to PATH.

### Option B: Using pgAdmin

- Open pgAdmin → connect to your server
- Create `app_db` if needed
- Right click `app_db` → Query Tool
- Open and run `schema.sql`

## 3) Quick sanity checks

```sql
\dt
SELECT * FROM roles;
```

## Notes

- Enum values in `schema.sql` are placeholders; update them to your exact business rules.
- Table names use plurals (`users`, `order_items`, etc.) to avoid PostgreSQL reserved words.
