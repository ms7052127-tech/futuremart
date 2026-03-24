# FutureMart Backend

> Multi-Vendor Order & Inventory Management Backend — built with Node.js, Express.js & MongoDB

---

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Folder Structure](#folder-structure)
- [Setup (Local)](#setup-local)
- [Setup (Docker)](#setup-docker)
- [Environment Variables](#environment-variables)
- [Seeding Sample Data](#seeding-sample-data)
- [API List](#api-list)
- [Business Rules Implemented](#business-rules-implemented)
- [Assumptions Made](#assumptions-made)

---

## Architecture Overview

```
Client Request
    │
    ▼
Express Router (src/routes/)
    │
    ▼
Middleware Chain
  ├── helmet / cors / morgan
  ├── JWT Authentication (protect)
  ├── Role Authorization (authorize)
  ├── Joi Validation (validate)
  └── Vendor Approval Check (approvedVendorOnly)
    │
    ▼
Controller (src/controllers/)   ← thin layer, no logic
    │
    ▼
Service (src/services/)         ← all business logic lives here
    │
    ▼
Mongoose Model (src/models/)    ← schema + pre-hooks
    │
    ▼
MongoDB
```

**Key design decisions:**
- **Thin controllers, fat services** — business logic is isolated in service files, making it independently testable.
- **MongoDB transactions** — order placement and cancellation use Mongoose sessions to ensure stock and order creation are atomic (no partial failures).
- **Soft deletes** — products are marked `isDeleted: true` rather than physically removed, preserving order history integrity.
- **Stock snapshots on orders** — `priceAtPurchase` and `productName` are stored directly on each order item so historical order data stays accurate even if the product is later updated.
- **Stock logs** — every stock change (order, cancellation, manual update, admin adjustment) produces a `StockLog` record for full audit trail.

---

## Folder Structure

```
futuremart/
├── src/
│   ├── config/
│   │   ├── db.js               # MongoDB connection
│   │   └── swagger.js          # Swagger/OpenAPI setup
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── product.controller.js
│   │   ├── order.controller.js
│   │   ├── admin.controller.js
│   │   └── stockLog.controller.js
│   ├── middlewares/
│   │   ├── auth.js             # JWT protect + authorize + approvedVendorOnly
│   │   ├── validate.js         # Joi schema validation wrapper
│   │   └── errorHandler.js     # Global error + 404 handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── StockLog.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── product.routes.js
│   │   ├── order.routes.js
│   │   ├── admin.routes.js
│   │   └── stockLog.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── product.service.js
│   │   ├── order.service.js
│   │   └── admin.service.js
│   ├── utils/
│   │   ├── apiResponse.js      # Standardized response helper
│   │   ├── generateOrderNumber.js
│   │   ├── logger.js           # Winston logger
│   │   └── pagination.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── product.validator.js
│   │   └── order.validator.js
│   ├── app.js                  # Express app (routes, middleware setup)
│   └── server.js               # Entry point (DB connect + listen)
├── scripts/
│   └── seed.js                 # Sample seed data
├── tests/
│   └── order.test.js           # Unit tests (Jest)
├── logs/                       # Auto-created by Winston
├── .env.example
├── .gitignore
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── FutureMart.postman_collection.json
└── package.json
```

---

## Setup (Local)

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017

### Steps

```bash
# 1. Clone / unzip the project
cd futuremart

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your values

# 4. Seed sample data
npm run seed

# 5. Start development server
npm run dev

# Server starts at: http://localhost:5000
# Swagger Docs at:  http://localhost:5000/api-docs
```

---

## Setup (Docker)

```bash
# Start API + MongoDB
docker compose up --build -d

# Seed sample data (after containers are up)
docker compose exec api node scripts/seed.js

# Optional: start with MongoDB Express UI
docker compose --profile debug up --build -d
# MongoDB Express: http://localhost:8081

# Stop everything
docker compose down

# Stop and remove volumes (clears DB data)
docker compose down -v
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/futuremart` |
| `JWT_SECRET` | JWT signing secret | *(required)* |
| `JWT_EXPIRES_IN` | Access token expiry | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | *(required)* |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `ADMIN_EMAIL` | Admin seed email | `admin@futuremart.com` |
| `ADMIN_PASSWORD` | Admin seed password | `Admin@123` |

---

## Seeding Sample Data

```bash
npm run seed
```

Creates:

| Role | Email | Password |
|---|---|---|
| Admin | admin@futuremart.com | Admin@123 |
| Vendor (approved) | techstore@futuremart.com | Vendor@123 |
| Vendor (approved) | fashionhub@futuremart.com | Vendor@123 |
| Vendor (pending) | pending@futuremart.com | Vendor@123 |
| Customer | rahul@example.com | Customer@123 |
| Customer | priya@example.com | Customer@123 |

Also creates 7 sample products and 1 sample order.

---

## API List

All routes are prefixed with `/api/v1`.

### Auth
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/auth/register/customer` | Public | Register customer |
| POST | `/auth/register/vendor` | Public | Register vendor (status=pending) |
| POST | `/auth/login` | Public | Login (rate limited: 10/15min) |
| GET | `/auth/me` | All | Get own profile |
| POST | `/auth/refresh-token` | Public | Refresh access token |

### Products
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/products` | All | List all active products (filter/search/sort/paginate) |
| GET | `/products/:id` | All | View single product |
| GET | `/products/vendor/my-products` | Vendor | List own products |
| POST | `/products` | Vendor | Create product |
| PATCH | `/products/:id` | Vendor | Update own product (stock logs if stock changes) |
| DELETE | `/products/:id` | Vendor | Soft delete own product |
| PATCH | `/products/:id/stock` | Admin | Manually adjust stock |

### Orders
| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/orders` | Customer | Place order (atomic stock deduction) |
| GET | `/orders/my-orders` | Customer | View own orders |
| GET | `/orders/vendor-orders` | Vendor | View orders with own items |
| GET | `/orders/all` | Admin | View all orders |
| PATCH | `/orders/:id/status` | All* | Update order status |

*Status update rules enforced by role (see Business Rules).

### Admin
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Platform stats & top charts |
| GET | `/admin/vendors` | Admin | List vendors (filter by status) |
| PATCH | `/admin/vendors/:id/status` | Admin | Approve/reject vendor |
| GET | `/admin/stock-logs` | Admin | All stock movement logs |

### Stock Logs
| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/stock-logs/vendor` | Vendor | Own products' stock history |

---

## Business Rules Implemented

1. **Vendor approval flow** — vendor registers with `status=pending`; only admin can approve/reject; pending/rejected vendors cannot add or manage products.
2. **SKU uniqueness** — duplicate SKU fails with a clear error.
3. **Discount price validation** — `discountPrice` must be less than `price`; enforced at model and service level.
4. **Stock cannot go negative** — order fails immediately if any item has insufficient stock.
5. **Inactive products are not purchasable** — order service filters only `status=active` products.
6. **Atomic order + stock update** — MongoDB session/transaction ensures both succeed or both roll back.
7. **Order status machine** — strict allowed transitions: `placed → confirmed → packed → shipped → delivered`; also `placed/confirmed → cancelled`.
8. **Customer cancellation** — customer can cancel only while order is in `placed` state.
9. **Vendor restrictions** — vendor cannot jump to `delivered` directly from `placed`; vendor can only update orders that contain their products.
10. **Stock restoration on cancel** — cancelling an order restores stock and creates a `StockLog` with `changeType=order_cancelled`.
11. **Revenue calculation** — dashboard counts only orders with `paymentStatus=paid` or `orderStatus=delivered` to avoid inflating revenue with unpaid orders.
12. **Vendor order isolation** — vendor orders endpoint strips items not belonging to the requesting vendor.
13. **Soft deletes** — products are never hard-deleted; existing order references remain valid.
14. **Pagination, filtering, sorting** — supported on all list endpoints.
15. **Rate limiting on login** — max 10 attempts per 15 minutes per IP.

---

## Assumptions Made

1. **Payment is simulated** — there is no real payment gateway. `paymentStatus` can be set to `paid` at order placement for testing.
2. **Single-address orders** — one delivery address per order (not per item/vendor).
3. **Refresh token rotation** — each refresh generates a new refresh token and invalidates the old one.
4. **Admin is seeded** — admin accounts are created via the seed script, not through a public API.
5. **Stock logs are append-only** — logs are never updated or deleted; they serve as an immutable audit trail.
6. **Top stats by revenue** — "top vendors by sales" is ranked by revenue (price × quantity), not by order count.
7. **Text search** — product search uses MongoDB `$text` index on `productName` and `category` fields.

---

## Running Tests

```bash
npm test
```

Tests cover:
- All valid and invalid order status transitions
- Order placement business logic (stock checks, price selection)
- Discount price validation rules
