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

Khi `brewlite-api` khởi động, TypeORM tự động khởi tạo kết nối và thực thi các migration kèm seed dữ liệu mẫu (`dataSource.runMigrations({ transaction: 'all' })`):
- Bảng `categories`, `products` và `product_options`: Tạo cấu trúc danh mục và sản phẩm kèm các tùy chọn Size, Topping và số lượng tồn kho.
- Bảng `users`: Quản lý tài khoản và phân quyền RBAC (`CUSTOMER`, `STAFF`, `MANAGER`), seed sẵn tài khoản quản trị và nhân viên mẫu.
- Bảng `orders` và `order_items`: Lưu trữ đơn hàng, snapshot chi tiết món, giá server-side và trạng thái xử lý đơn.
- Bảng `payments` và `payment_reviews`: Quản lý giao dịch thanh toán VNPay Sandbox, idempotency key và bảng đối soát thủ công khi có sai lệch.

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

### 5. Trạng thái tích hợp Sprint 2 và E2E Flow

- **Auth, Orders, Inventory & VNPay Sandbox:** Đã hoàn thành tích hợp từ `feat/task-5.1` vào nhánh tích hợp `feat/sprint-2-integration`.
- **E2E Flow (Menu → Đặt đơn → Xác nhận thanh toán):** Giao diện người dùng và API đã kết nối đầy đủ. Kịch bản automated E2E test đang được bổ sung trong Phase 3 để nghiệm thu toàn diện Issue #29.

## Phát triển và review

Mở PR về `develop` và ghi số issue trong mô tả. Reviewer: Hiển (`mhien06`). Ghi cách chạy, kết quả kiểm thử và phần còn vướng trước khi bàn giao.
Lưu thông tin bí mật trong biến môi trường của từng máy hoặc môi trường triển khai, không commit secret vào source code.
