# Data Model Reference

**Status:** Integrated schema through **Feature 4** (`users`, `sessions`, `lists`, `todos`).  
**Authority for new work:** feature specs in `features/` — update this file in the same PR when schema changes.  
**Architecture:** [ADR-0003 — MySQL relational database](../../docs/adr/0003-mysql-relational-database.md)

## Feature provenance

| Table / column | Introduced |
|----------------|------------|
| `users`, `sessions` | Feature 1 |
| `lists` | Feature 1 (table); Feature 2 (CRUD) |
| `todos` | Feature 3 |
| Profile GET/PUT on existing `users` (no new table) | Feature 4 |

---

## `users`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `fName` | STRING | Required |
| `lName` | STRING | Required |
| `email` | STRING | Required, unique |
| `username` | STRING(100) | Required, unique; trimmed and stored lowercase (`beforeValidate` hook) |
| `password` | STRING(255) | Required; bcrypt hash only (never returned by API) |
| `role` | STRING(20) | Default `worker`; read-only on profile update (Feature 4) |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

**Sequelize:** `defaultScope` excludes `password` from query results. Use `unscoped()` when comparing passwords at login or hashing a new password on profile update.

Feature 4 edits `fName`, `lName`, `email`, and `username` via `PUT /todo/users/:id`. Password is optional on that update; when provided it is bcrypt-hashed. No new columns.

---

## `sessions`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `token` | STRING(512) | Required; JWT string; cleared to `""` on logout |
| `email` | STRING | Required |
| `expirationDate` | DATE | Required; 24-hour lifetime from creation |
| `userId` | INTEGER FK | Required → `users.id` |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## `lists`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `name` | STRING(100) | Required; trimmed; max 100 characters |
| `userId` | INTEGER FK | Required → `users.id`; set from `req.user.id` on create (never from client body) |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

Feature 2 delivers list create, rename, and delete. Reads remain scoped to `userId = req.user.id`.

---

## `todos`

| Column | Type | Rules |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `listId` | INTEGER FK | Required → `lists.id`; cascade on list delete |
| `title` | STRING(255) | Required; trimmed; max 255 characters |
| `completed` | BOOLEAN | Default `false` |
| `userId` | INTEGER FK | Required → `users.id`; set from `req.user.id` on create |
| `createdAt` | DATE | Sequelize timestamps |
| `updatedAt` | DATE | Sequelize timestamps |

---

## Associations

* `User hasMany Session` — `onDelete: CASCADE`
* `Session belongsTo User`
* `User hasMany List` — `onDelete: CASCADE`
* `List belongsTo User`
* `List hasMany Todo` — `onDelete: CASCADE`
* `Todo belongsTo List`
* `User hasMany Todo`
* `Todo belongsTo User`
