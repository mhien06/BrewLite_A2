# BrewLite — Assignment 2

BrewLite là ứng dụng đặt đồ uống với Next.js, NestJS và PostgreSQL. Phạm vi A2 đi từ xem menu, chọn món và đặt đơn đến thanh toán qua VNPay Sandbox và theo dõi đơn.

## Tài liệu

- [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md)
- [Đặc tả yêu cầu (SRS)](docs/requirements/srs.md)
- [Use case đặt và thanh toán đơn](docs/requirements/use-case-checkout.md)
- [Sơ đồ nghiệp vụ](docs/diagrams/exports/)
- [Kiến trúc và ADR](docs/architecture/architecture.md)
- [Thiết kế triển khai](docs/architecture/deployment.md)

Ma trận truy vết `docs/traceability-matrix.md` được bổ sung ở Task 4.2 (#19).

## Hai sprint

- **Sprint 1 — Task 4:** Thiết lập repository, quản lý tài liệu, triển khai menu và API sản phẩm, thiết lập CI.
- **Sprint 2 — Task 5:** Hoàn thiện luồng đặt và thanh toán, kiểm thử tích hợp, đóng gói và bàn giao.

## Chạy trên máy và Kiểm thử (Task 5.2 - Issue #29)

Yêu cầu môi trường: Node.js 24, pnpm 11 và Docker Desktop.

### 1. Khởi chạy hệ thống bằng Docker Compose

Cấu hình mẫu được cung cấp tại `.env.example`. Tạo file cấu hình và khởi chạy các dịch vụ:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up --build -d
docker compose ps
```

Các container sẽ khởi chạy theo thứ tự phụ thuộc (`depends_on: condition: service_healthy`):
1. `brewlite-db` (`postgres:16-alpine`): Khởi động cơ sở dữ liệu PostgreSQL tại cổng host `5434` (tránh xung đột với BrewLite A1). Dữ liệu được lưu trữ bền vững trên volume `brewlite_a2_pg`. Kiểm tra trạng thái bằng `pg_isready`.
2. `brewlite-api` (`apps/api/Dockerfile`): Khởi động sau khi database healthy, tự động chạy migration & seed và lắng nghe tại cổng `3003`.
3. `brewlite-web` (`apps/web/Dockerfile`): Khởi động sau khi API healthy, phục vụ giao diện tại `http://localhost:3002`.

### 2. Migration và Seed dữ liệu

Hệ thống sử dụng TypeORM migrations để tự động kiến tạo toàn bộ schema và seed danh mục đồ uống từ database trống.

**Lệnh tái tạo toàn bộ schema và seed dữ liệu từ database trống:**
```powershell
$env:DATABASE_URL="postgresql://postgres:brewlite_local@localhost:5434/brewlite_a2"
pnpm db:migrate
```
*(Trong môi trường Docker Compose, lệnh migration & seed được tự động thực thi khi container `brewlite-api` khởi động thông qua `dataSource.runMigrations({ transaction: 'all' })`).*

Cấu trúc dữ liệu được khởi tạo:
- Bảng `products`, `product_options`: 4 sản phẩm chính kèm 6 tùy chọn Size (S/M/L) và Topping (Trân châu/Kem sữa/Thạch cà phê) cùng tồn kho ban đầu và đường dẫn ảnh.
- Bảng `users`: Quản lý tài khoản người dùng và phân quyền RBAC (`CUSTOMER`, `STAFF`, `MANAGER`).
- Bảng `orders`, `order_items`: Lưu trữ đơn hàng, snapshot chi tiết món, giá server-side và trạng thái đơn.
- Bảng `payments`, `payment_reviews`: Quản lý giao dịch thanh toán VNPay Sandbox, idempotency key, audit event và bảng đối soát sai lệch.

### 3. Kiểm tra Healthcheck (`GET /health`)

Endpoint `GET /health` tại `http://localhost:3003/health` kiểm tra đồng thời trạng thái API và kết nối database thực tế (`SELECT 1`):

- **Khi PostgreSQL hoạt động bình thường:**
  ```powershell
  curl.exe -i http://localhost:3003/health
  # Kết quả trả về: HTTP/1.1 200 OK
  # Body: {"status":"ok"}
  ```

- **Khi PostgreSQL bị dừng hoặc mất kết nối:**
  ```powershell
  docker compose stop db
  curl.exe -i http://localhost:3003/health
  # Kết quả trả về: HTTP/1.1 503 Service Unavailable
  # Body: {"statusCode":503,"message":"Database unavailable."}
  docker compose start db
  ```

### 4. Chạy Unit Tests và Integration Tests

Hệ thống cung cấp đầy đủ các bộ kiểm thử cho toàn bộ các module của Sprint 2:

```powershell
# Chạy toàn bộ Unit test trong repo (không cần kết nối Database)
pnpm test

# Chạy Unit test riêng cho API (JWT, Roles Guard, Order calculations, VNPay Gateway)
pnpm --filter @brewlite/api test

# Chạy Unit test cho Web components (Payment panel, Store, Auth form, Checkout)
pnpm --filter @brewlite/web test

# Chạy Integration test cho Orders, Inventory concurrency và VNPay payment settlement
# Yêu cầu database PostgreSQL đang chạy (qua Docker hoặc cục bộ):
$env:TEST_DATABASE_URL="postgresql://postgres:brewlite_local@localhost:5434/brewlite_a2"
pnpm --filter @brewlite/api test
```

### 5. Kiểm thử Tự động Toàn trình (Automated E2E Tests)

Hệ thống cung cấp hai bộ automated E2E test kiểm chứng luồng nghiệp vụ khách hàng:

```powershell
# 1. Automated E2E API & Database Verification (Menu -> Cart -> Register -> Create Order -> Payment Init -> DB Verification)
# Yêu cầu hệ thống đang chạy (Docker hoặc dev server):
pnpm test:e2e

# 2. Automated E2E UI Test với Trình duyệt Chromium thực tế (Playwright)
pnpm exec playwright test
```

> [!NOTE]
> **Phạm vi kiểm thử E2E và Thanh toán VNPay:**
> - Kiểm thử E2E UI (`playwright test`) kiểm chứng toàn bộ hành vi người dùng trên giao diện: Khám phá Menu, chọn sản phẩm, tùy biến Size/Topping, thêm giỏ hàng, đăng ký tài khoản mới, tạo đơn hàng và nhận màn hình Xác nhận đơn (`Order Received`). Bước redirect sang cổng thanh toán bên thứ ba được chặn (`intercept`) nhằm giữ trình duyệt tập trung xác minh màn hình xác nhận đơn hàng của BrewLite.
> - Kiểm thử `pnpm test:e2e` và bộ Integration tests (`apps/api`) kiểm chứng trực tiếp API `POST /orders/:id/payments`, tạo giao dịch trong bảng `payments`, kiểm tra trạng thái `PENDING`, tính toàn vẹn dữ liệu trong PostgreSQL, hoàn trả kho khi hủy/hết hạn và chống trùng lặp (idempotency) mà không thực hiện giao dịch tài chính thật.

## Phát triển và review

Mở PR về `develop` và ghi số issue trong mô tả. Reviewer: Hiển (`mhien06`). Ghi cách chạy, kết quả kiểm thử và phần còn vướng trước khi bàn giao.
Lưu thông tin bí mật trong biến môi trường của từng máy hoặc môi trường triển khai, không commit secret vào source code.
