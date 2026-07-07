# Feature Spec: Inventory

> The Inventory domain tracks materials and consumables: a catalog, stock levels, reorder points, project allocations, and delivery receipts. It answers "do we have enough rebar for the pour," "what's running low," and "what arrived on the truck today."

Companion docs: [equipment.md](./equipment.md), [../api/endpoints.md → Inventory](../api/endpoints.md#inventory), [../database/schema.md → Inventory Domain](../database/schema.md#inventory-domain). Roadmap: Phase 3.

---

## Table of Contents

- [Overview](#overview)
- [User Stories](#user-stories)
- [Data Model](#data-model)
- [Permissions & Roles](#permissions--roles)
- [Movements & Ledger](#movements--ledger)
- [Reorder & Low-Stock](#reorder--low-stock)
- [API Surface](#api-surface)
- [UI / UX](#ui--ux)
- [Edge Cases & Rules](#edge-cases--rules)
- [Non-Functional Requirements](#non-functional-requirements)
- [Open Questions](#open-questions)

---

## Overview

A **Material** is a type of stuff the tenant consumes — rebar, cement, fasteners, PPE. The inventory domain maintains the **catalog** of materials, the **on-hand stock level** per material, and an **append-only ledger** of every movement (receive, consume, adjust, transfer). Stock can be allocated to projects, and incoming deliveries are recorded against materials.

Inventory is tenant-scoped. Stock levels are a projection of the movement ledger, kept consistent transactionally.

## User Stories

- **As an inventory manager**, I maintain a catalog of materials with units and reorder points.
- **As receiving staff**, I record a delivery against a material so stock goes up and the receipt is on file.
- **As a site engineer**, I record material consumption against my project so stock stays accurate.
- **As an inventory manager**, I get alerted when a material hits its reorder point.
- **As a PM**, I see what materials are allocated to my project and what's on hand.

## Data Model

See [../database/schema.md → Inventory Domain](../database/schema.md#inventory-domain).

- **`material`** — `id`, `tenantId`, `sku` (unique within tenant), `name`, `unit`, `reorderPoint`.
- **`stock_level`** — one row per material: `quantity` (current on-hand).
- **`inventory_transaction`** — append-only ledger: `type`, `quantity` (signed), `materialId`, `projectId?`, `taskId?`, `costCents?`, `note`, `actorId`, `createdAt`.
- **`delivery_receipt`** — incoming delivery: `supplier`, `materialId`, `quantity`, `costCents?`, attachments.

`stock_level.quantity` is the running projection of `inventory_transaction` quantities, updated in the same transaction as each insert.

## Permissions & Roles

| Role | View | Record movement | Manage catalog | Adjust |
| --- | --- | --- | --- | ❌ |
| `viewer` | ✅ | ❌ | ❌ | ❌ |
| `crew` | allocations only | consume (assigned) | ❌ | ❌ |
| `engineer` | ✅ | receive/consume | ❌ | ❌ |
| `manager`+ | ✅ | ✅ | ✅ | ✅ |

`adjust` (manual corrections) is manager+ and always carries a note; it's audit-logged distinctly from normal movements.

## Movements & Ledger

Every stock change is a ledger entry (`inventory_transaction`) of a type:

| Type | Effect on stock | Example |
| --- | --- | --- |
| `receive` | + | delivery arrives |
| `consume` | − | material used on a task |
| `transfer` | 0 (net) | move between projects/stores |
| `adjust` | ± | correction with a reason |

Rules:

- **Append-only.** Ledger entries are never edited or deleted; corrections are new `adjust` entries. This makes stock history auditable and tamper-evident.
- **`stock_level` is updated transactionally** with each ledger insert — the two are always consistent.
- **Quantities are exact** (`Decimal`), never floats.
- **Cost** is optional on receives/adjusts; when present, it feeds inventory valuation reports.

## Reorder & Low-Stock

- Each material has a `reorderPoint`; when `stock_level.quantity <= reorderPoint`, it appears in the low-stock list.
- **Low-stock detection** runs on every movement; crossing the threshold downward emits a `inventory.below-reorder` event (consumed by [notifications.md](./notifications.md)).
- **Restock** is a normal `receive` movement that brings stock back above the threshold; the alert clears.
- The dashboard surfaces a count of low-stock materials; reports can project days-of-cover from average consumption.

## API Surface

See [../api/endpoints.md → Inventory](../api/endpoints.md#inventory). Key flows:

- `GET /materials` → catalog; `POST/PATCH /materials` → manage.
- `GET /materials/:id/stock` → current level; `GET /materials/low-stock` → reorder alerts.
- `POST /inventory/transactions` → record a movement (receive/consume/adjust/transfer).
- `GET /inventory/transactions?materialId=&projectId=&type=` → ledger query (paginated).
- `POST /deliveries` → record a delivery receipt (also creates the `receive` movement).

## UI / UX

- **Materials catalog** — `ResourceTable` with SKU, name, unit, on-hand, reorder point, status badge (ok / low).
- **Material detail** — current stock, trend, recent movements, deliveries.
- **Movement entry** — quick form: material, type, quantity, project/task, note. Optimistic update with rollback.
- **Low-stock board** — filterable list of materials at/below reorder; one-click "record delivery."
- **Delivery receipt** — form with supplier, quantity, cost, photo/attachment of the packing slip.
- Mobile-first: receive/consume flows optimized for scanning/searching a material and entering a number.

## Edge Cases & Rules

- **SKU unique within tenant** — `409 CONFLICT` on duplicate.
- **Stock cannot go negative** — a consume that would drive stock below zero returns `422 INSUFFICIENT_STOCK` (configurable: warn-and-allow vs. block; default block).
- **Adjustments require a note** and are tagged distinctly in reports.
- **Deleting a material** is blocked if it has movements; archive instead (retain history).
- **Deliveries** create both a `delivery_receipt` and a `receive` transaction in one atomic operation.
- **Tenancy:** all queries scoped by `tenantId`; cross-tenant access returns 404 and is tested.

## Non-Functional Requirements

- **Consistency:** stock level and ledger always agree (same transaction).
- **Performance:** catalog and low-stock queries cached (short TTL); ledger query paginated.
- **Audit:** every movement, delivery, and adjustment audit-logged.
- **Notifications:** low-stock threshold crossing and delivery-received events emitted.

## Open Questions

- **Multiple stores/warehouses:** do we model per-location stock for v1, or a single on-hand per material? (Leaning single per material; add stores if needed.)
- **Barcode/QR scanning** at receiving — valuable for field use; candidate for a near-term enhancement.
- **Supplier catalog** as first-class entities vs. a free-text field on deliveries — defer suppliers until procurement is a domain.
- **Bills of materials** (task → required materials auto-consume) — attractive but deferred beyond v1.
