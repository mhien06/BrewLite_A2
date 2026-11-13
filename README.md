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

## Chạy trên máy và Kiểm thử (Task 5.2)

Yêu cầu môi trường: Node.js 24, pnpm 11 và Docker Desktop.

### 1. Khởi chạy hệ thống bằng Docker Compose

Cấu hình mẫu được cung cấp tại `.env.example`. Tạo file cấu hình và khởi chạy các dịch vụ:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up --build -d
docker compose ps
```

Các container sẽ khởi chạy theo thứ tự phụ thuộc (`depends_on: condition: service_healthy`):
1. `brewlite-db` (`postgres:16-alpine`): Khởi động và kiểm tra bằng `pg_isready`. Dữ liệu được lưu bền vững trên volume `pgdata`.
2. `brewlite-api` (`apps/api/Dockerfile`): Khởi động sau khi database healthy, tự động chạy migration/seed và lắng nghe tại cổng `3001`.
3. `brewlite-web` (`apps/web/Dockerfile`): Khởi động sau khi API healthy, phục vụ giao diện tại `http://localhost:3000`.

### 2. Migration và Seed dữ liệu

Khi `brewlite-api` khởi động, TypeORM tự động khởi tạo kết nối và thực thi các migration kèm seed dữ liệu mẫu:
- Bảng `products` và `product_options` được tạo lập.
- Tự động seed 4 sản phẩm đồ uống mẫu (`Cà phê sữa`, `Bạc xỉu`, `Trà đào`, `Matcha latte`) cùng các tùy chọn Size (S, M, L) và Topping (Trân châu, Kem sữa, Thạch cà phê).
- Cập nhật ảnh sản phẩm tương ứng trong thư mục `public/products/`.

### 3. Kiểm tra Healthcheck (`GET /health`)

Endpoint `GET /health` tại `http://localhost:3001/health` kiểm tra đồng thời trạng thái API và kết nối database thực tế (`SELECT 1`):

- **Khi PostgreSQL hoạt động bình thường:**
  ```powershell
  curl.exe -i http://localhost:3001/health
  # Kết quả trả về: HTTP/1.1 200 OK
  # Body: {"status":"ok"}
  ```

- **Khi PostgreSQL bị dừng hoặc mất kết nối:**
  ```powershell
  docker compose stop db
  curl.exe -i http://localhost:3001/health
  # Kết quả trả về: HTTP/1.1 503 Service Unavailable
  # Body: {"message":"Không kết nối được cơ sở dữ liệu.","error":"Service Unavailable","statusCode":503}
  docker compose start db
  ```

### 4. Chạy Unit Tests và Integration Tests hiện có

Các bài kiểm tra độc lập của Sprint 1 và Task 5.2 có thể chạy trực tiếp bằng Node.js test runner:

```powershell
# Unit test logic tính toán chi tiết món và tùy chọn (API)
node --test apps/api/src/catalog-domain.test.mjs

# Unit test định dạng tiền tệ và hiển thị tồn kho (Web)
node --test apps/web/app/catalog.test.mjs

# Integration test API Catalog với database PostgreSQL đang chạy (yêu cầu Docker Compose up)
node --test tests/catalog-api.test.mjs
```

### 5. Các bài kiểm thử đang tạm thời BLOCKED (chờ tích hợp)

Các hạng mục sau thuộc phạm vi của các thành viên khác và đang được chặn (BLOCKED) tích hợp trên nhánh `develop`:

1. **Unit tests & Integration tests Auth & Đơn hàng (Khoa - Task 5.1):**
   - Đã được triển khai trên nhánh `feat/task-5.1` (`order-calculations.test.ts`, `jwt.service.test.ts`, `roles.guard.test.ts`, `orders.integration.test.ts`).
   - *Trạng thái:* Chờ hoàn tất review và merge PR từ `feat/task-5.1` vào nhánh `develop`.
2. **Unit tests & Integration tests Thanh toán & VNPay (Thành):**
   - Kiểm tra chuyển đổi trạng thái thanh toán (`PENDING_PAYMENT` -> `PAID`, `FAILED`, `EXPIRED`, `UNKNOWN`), xử lý IPN, Return URL và đối soát giao dịch (QueryDR).
   - *Trạng thái:* Nhánh `feature/task-5.1-vnpay` chưa hoàn thành mã nguồn module thanh toán.
3. **E2E Test toàn trình (Menu → Đặt đơn → Xác nhận) (Hiển / Frontend Team):**
   - Giao diện người dùng hiện tại chỉ bao gồm trang Menu và Chi tiết món (Sprint 1), chưa có giao diện Giỏ hàng (Cart) và Đặt hàng (Checkout).
   - *Trạng thái:* Chờ hoàn thiện UI giỏ hàng/đặt đơn và kịch bản Playwright/Cypress tương ứng.

## Phát triển và review

Mở PR về `develop` và ghi số issue trong mô tả. Thành review phần Hiển thực hiện. Hiển review phần các thành viên khác thực hiện. Ghi cách chạy, kết quả kiểm thử và phần còn vướng trước khi bàn giao.

Bổ sung kết quả CI, hướng dẫn deploy/rollback và URL production khi hoàn tất các phần tương ứng. Lưu thông tin bí mật trong biến môi trường của từng máy hoặc môi trường triển khai.

