# Task 5.1 – Staff order handling

This API is for authenticated `STAFF` and `MANAGER` accounts. The backend applies both the JWT guard and role guard; hiding the page in the web app is not an authorization boundary.

## Local staff account

1. Start the API and database using the repository's local setup so migrations run.
2. Register a normal local account through `/register` or `POST /auth/register`.
3. Promote only that local account in the local database. Replace the placeholder with the email used during registration:

   ```sql
   UPDATE users
   SET role = 'STAFF'
   WHERE lower(email) = lower('<local-account-email>')
     AND status = 'ACTIVE';
   ```

4. Sign out and sign in again so the newly issued JWT contains the `STAFF` role. Use the same procedure with `MANAGER` only when testing manager access.

Public registration deliberately does not accept a role field. Never use production credentials or store a real password in this guide.

## Endpoints

All endpoints below require `Authorization: Bearer <accessToken>` and the `STAFF` or `MANAGER` role.

| Method and path | Purpose |
|---|---|
| `GET /staff/orders` | List store orders, items, customer display name, order status, latest payment status, and whether payment is verified. |
| `GET /staff/orders/:id` | Return the same safe detail for one order; unknown IDs return `404`. |
| `PATCH /staff/orders/:id/status` | Move an order forward by exactly one processing step. |

Example request body:

```json
{ "status": "PREPARING" }
```

In Postman, choose the method/path from the table, add `Authorization: Bearer <accessToken>` and set the PATCH request body to **raw → JSON**. Test with a customer token for `403`, no token for `401`, an unpaid order for `409`, then move a paid order through each status one request at a time. `GET /staff/orders/:id` returns `404` for an unknown ID.

Valid transitions are `PAID → PREPARING → READY_FOR_PICKUP → COMPLETED`. The server requires a matching, successful, non-review payment before the first transition. Invalid, skipped, backward, unpaid, or completed order updates return `409`. Invalid request bodies return `400`; missing/invalid JWT returns `401`; customers receive `403`.

The order row is locked inside a database transaction before the transition is checked and written. Concurrent requests therefore see the latest status and cannot skip a step. The existing customer `GET /orders` reads the same order status, so it reflects staff updates without modifying customer checkout/history pages.

## Web

Open `/staff/orders` with a local `STAFF` or `MANAGER` account. The page shows order and payment statuses separately, displays size/toppings/quantity/amount, asks for confirmation before a transition, and presents loading, empty, error, and success states. Layout rules include desktop and mobile breakpoints.

## Verification

- API integration coverage: authentication/role checks, safe list/detail responses, payment gate, valid transitions, invalid and terminal transitions, and concurrent updates.
- Web component coverage: unauthenticated/customer access, payment status, confirmation, update flow, and unpaid-order handling.
- From repository root: `pnpm lint`, `pnpm test`, and `pnpm build`.
- Database integration tests run when `TEST_DATABASE_URL` is configured; use a disposable local test database, never production.

