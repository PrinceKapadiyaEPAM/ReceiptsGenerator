# Receipts API (Node.js)

Backend API project for server-side features like DB-backed receipt management.

## Stack

- Node.js + Express
- PostgreSQL (pg)
- Validation with zod

## Quick Start

1. Install dependencies:
   npm install
2. Configure environment:
   copy `.env.example` to `.env` and adjust values
3. Ensure PostgreSQL is running and the database exists (`receipts_gen` by default)
4. Run in development mode:
   npm run dev

Server runs by default at `http://localhost:8788`.

## Endpoints

- `GET /api/health`
- `GET /api/v1/receipts?limit=25&offset=0`
- `GET /api/v1/receipts/:id`
- `POST /api/v1/receipts`
- `POST /api/v1/receipts/bulk`

## Frontend Integration

Set `VITE_RECEIPTS_API_BASE_URL` in the frontend env if your API is not on default:

- Default used by UI: `http://localhost:8788/api/v1`

### Sample Create Payload

```json
{
  "receiptNumber": "R-2026-0001",
  "receiptDate": "2026-04-18",
  "memberName": "Amit Shah",
  "flatShopNo": "A-101",
  "totalAmount": 5000,
  "notes": "Paid via online transfer"
}
```

## Database

- Configure using `POSTGRES_URL` or the `POSTGRES_*` variables in `.env`
- Table `receipts` is auto-created at startup.
