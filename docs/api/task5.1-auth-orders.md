# Task 5.1 API contract: authentication and orders

Base URL: `http://localhost:3001`. JSON requests and responses use UTF-8. Error responses have `{ statusCode, error, code?, message, details?, path, timestamp }`.

**Implementation status:** this contract follows the ZIP proposal for #26. Confirm the request/response shapes and error codes with Hiển and Thành before integrating #25/#27.

## Authentication

### `POST /auth/register`

Public. Creates a `CUSTOMER` account; roles cannot be assigned by the client.

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "at-least-8-characters",
  "confirmPassword": "at-least-8-characters"
}
```

Returns `201` with `{ accessToken, tokenType: "Bearer", expiresIn, account: { id, fullName, email, role } }`. Passwords are bcrypt hashed. A duplicate email returns `409 EMAIL_EXISTS`; mismatched passwords return `409 PASSWORD_MISMATCH`.

### `POST /auth/login`

Public. Body: `{ "email": "a@example.com", "password": "..." }`. Returns the same session shape. Invalid credentials return `401 INVALID_CREDENTIALS`.

Send the token on protected routes as `Authorization: Bearer <accessToken>`. Tokens are HS256, default lifetime 3600 seconds, with no refresh token in the MVP.

`JWT_SECRET` must contain at least 32 characters. `JWT_EXPIRES_IN_SECONDS`, when set, must be a positive safe integer.

## Orders

All order routes require a valid token. `GET` routes only return records owned by the authenticated account; an order owned by another account is returned as `404 ORDER_NOT_FOUND`.

### `POST /orders`

The backend loads product and option prices from the database and ignores any client-supplied price fields. Product inventory is tracked per product, so quantities across lines for one product are summed before stock validation.

```json
{
  "items": [
    { "productId": 1, "sizeOptionId": 2, "toppingOptionIds": [4], "quantity": 2 }
  ]
}
```

`toppingOptionIds` may be omitted or empty. Each line's size and toppings must belong to its product. A successful response contains `{ orderId, status, subtotal, discountAmount, totalAmount, createdAt, items }`; each item contains `productId`, `productName`, `quantity`, `size: { id, name }`, `toppings: [{ id, name }]`, `unitPrice`, and `lineTotal`. The initial status is `PENDING_PAYMENT`. Prices are integer VND.

Insufficient inventory returns `409 INSUFFICIENT_STOCK` with `details: { productId, requested, available }`; the transaction rolls back completely. Invalid product options return `400 INVALID_PRODUCT_OPTION`.

### `GET /orders` and `GET /orders/:id`

Return the authenticated account's order summaries or one owned order with its immutable price and option snapshots.

## Common status codes

- `400`: invalid DTO or option selection.
- `401`: missing, invalid, or expired JWT; invalid credentials.
- `403`: a route with a role requirement was called by an account without that role.
- `404`: missing product/order, including an order owned by another account.
- `409`: duplicate email, password confirmation mismatch, or insufficient stock.

## Configuration

Set `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), optional `JWT_EXPIRES_IN_SECONDS`, `API_PORT`, and `FRONTEND_URL` in the local environment. Do not commit real credentials or secrets.

The API unit tests run with `pnpm --filter @brewlite/api test`. The auth/order integration test is skipped unless `TEST_DATABASE_URL` points to a dedicated PostgreSQL test database; it applies the migrations and exercises registration, login, order ownership, server-side pricing, inventory rollback, and concurrent checkout.
