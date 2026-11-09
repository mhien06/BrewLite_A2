# ADR-003: PostgreSQL với TypeORM, migration bắt buộc, khóa dòng khi trừ/hoàn tồn

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-08, FR-10, FR-11; NFR-07, NFR-09; RR-03, RR-04

## Bối cảnh
Hệ thống cần transaction đáng tin cậy, chống bán vượt tồn khi đặt đồng thời, chống ghi nhận trùng thanh toán và tái tạo được cấu trúc dữ liệu từ đầu (migration/seed).

## Quyết định
- **PostgreSQL** là nguồn dữ liệu duy nhất; **TypeORM** làm ORM; thay đổi lược đồ chỉ qua **migration** (không dùng `synchronize` ở môi trường chạy thật); có **seed** dữ liệu mẫu (Product, ProductOption, tài khoản mẫu).
- Tạo đơn: mở transaction, khóa các dòng `Product` liên quan bằng khóa ghi (`SELECT … FOR UPDATE`, sắp theo `id` để tránh deadlock), cộng số lượng theo Product, kiểm tra tồn, lưu `Order` + `OrderItem`, trừ `inventoryQuantity`, rồi commit; thiếu tồn hoặc lỗi thì rollback toàn bộ.
- Ràng buộc ở tầng database để bảo vệ quy tắc nghiệp vụ ngay cả khi code sai: `CHECK (inventoryQuantity >= 0)`; `UNIQUE` cho `Payment.idempotencyKey` và `Payment.transactionRef`; chỉ mục unique có điều kiện để mỗi `Order` có tối đa một `Payment` ở trạng thái `SUCCESS`.
- Hoàn tồn "đúng một lần": chuyển `Payment` sang `FAILED`/`EXPIRED` và hoàn tồn trong **cùng transaction**, điều kiện cập nhật `WHERE status IN ('PENDING','UNKNOWN')`.

## Phương án đã cân nhắc
- **Prisma:** migration tốt, nhưng khóa dòng và truy vấn khóa phải dùng raw query; TypeORM hỗ trợ khóa pessimistic và `QueryRunner` trực tiếp.
- **Khóa lạc quan (version column):** tránh khóa dòng nhưng phải thử lại khi xung đột, phức tạp hơn cho luồng tồn kho nhiều dòng.

## Hệ quả
- **Ưu điểm:** nhất quán mạnh, kiểm thử được tình huống đặt đồng thời; lược đồ tái tạo được (NFR-07).
- **Hạn chế:** khóa dòng làm các đơn cùng Product xử lý tuần tự (chấp nhận được ở quy mô MVP); nhóm phải viết migration cẩn thận và review kỹ.
- **Đánh đổi:** chấp nhận xử lý tuần tự các đơn cùng Product và công sức viết migration để đổi lấy nhất quán mạnh về tồn kho và thanh toán.
