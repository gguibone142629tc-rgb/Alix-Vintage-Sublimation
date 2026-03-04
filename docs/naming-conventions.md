# Alix Vintage Naming Conventions

This document defines naming rules for frontend and backend code.

## General Rules

- Use **English**, clear, descriptive names.
- Avoid abbreviations unless they are standard (e.g., `OTP`, `API`, `ID`).
- Prefer full words: `quantityInput` over `qtyInp`.
- Keep one naming style per identifier type.

## JavaScript / TypeScript

- Variables and functions: `camelCase`
  - Examples: `updateQuantity`, `createRosterRow`, `orderTotal`
- Constants:
  - Runtime constants: `camelCase` (e.g., `maxUploadMb`)
  - Global immutable config values: `UPPER_SNAKE_CASE` (e.g., `MAX_UPLOAD_MB`)
- Classes and constructor functions: `PascalCase`
  - Examples: `OrderService`, `CustomDesignRequest`
- Boolean variables: prefix with `is`, `has`, or `can`
  - Examples: `isReferenceOnly`, `hasRosterRows`, `canSubmit`
- Event handlers: prefix with `handle`
  - Examples: `handleAddPlayerClick`, `handlePersonalizationChange`
- Private/internal helper functions: prefix with verb
  - Examples: `updateRowNumbers`, `toggleReferenceNote`

## HTML / CSS

- CSS classes: `kebab-case`
  - Examples: `roster-table`, `upload-area`, `personalization-note`
- IDs: `kebab-case`
  - Examples: `roster-table`, `add-player`, `reference-note`
- Data attributes: `kebab-case`
  - Example: `data-target`, `data-order-type`

## Backend (Planned Layers)

- Domain entities and value objects: `PascalCase`
  - Examples: `User`, `Order`, `RosterEntry`
- Interfaces / ports: `PascalCase` with meaningful suffix
  - Examples: `OrderRepository`, `NotificationGateway`
- Use cases / services: `PascalCase` with action-oriented names
  - Examples: `CreateCustomDesignRequest`, `VerifyOtp`
- File names:
  - Frontend JS/TS files: `kebab-case` (e.g., `order-summary.js`)
  - Backend modules: `kebab-case` unless framework requires otherwise

## Naming Checklist

Before committing code:

1. Functions are verb-based and `camelCase`.
2. Classes are `PascalCase` and noun-based.
3. Booleans begin with `is`/`has`/`can`.
4. HTML classes and IDs use `kebab-case`.
5. No short unclear abbreviations.
