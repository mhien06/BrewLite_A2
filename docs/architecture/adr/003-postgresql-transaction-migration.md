# ADR-003: PostgreSQL với TypeORM, migration bắt buộc và transaction nguyên tử

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-15
- **Liên quan:** FR-06, FR-08, FR-10, FR-17 đến FR-20; NFR-07, NFR-09

## Bối cảnh

Hệ thống phải chống trừ/hoàn nguyên liệu và cộng/hoàn/bù điểm lặp khi IPN, QueryDR, thao tác hủy hoặc scheduler chạy đồng thời. Tồn kho được quản lý theo `Ingredient`, không còn dùng tồn kho cấp Product.

## Quyết định

- PostgreSQL là nguồn dữ liệu duy nhất; TypeORM là ORM; mọi thay đổi schema đi qua migration, không dùng `synchronize` ở môi trường chạy thật.
- Các bảng nghiệp vụ tuân theo Domain Class đã duyệt: `User`, `Cart`, `CartItem`, `Product`, `ProductOption`, `Ingredient`, `Recipe`, `RecipeIngredient`, `Order`, `OrderItem`, `OrderIngredientUsage`, `Payment`, `OrderCancellation`, `VNPayRefundRecord`, `LoyaltyTransaction`; enum `MeasurementUnit` dùng cho `Ingredient`, `RecipeIngredient` và `OrderIngredientUsage`. `Promotion` là `«future»`.
- **Tạo đơn:** khóa/kiểm tra dữ liệu giá và điểm, lưu `Order(PENDING)` + `OrderItem` snapshot và `expiresAt = createdAt + 15 phút`; không trừ nguyên liệu.
- **Xử lý Payment `SUCCEEDED`:** khóa Order, Payment và các `Ingredient` theo thứ tự ổn định; trừ `quantityOnHand` có điều kiện; ghi `OrderIngredientUsage` và `LoyaltyTransaction` trong cùng transaction rồi mới chuyển Order sang `PAID`.
- **Thiếu nguyên liệu sau khi đã thu tiền:** không trừ kho, không ghi `OrderIngredientUsage`, không `EARN`; giữ Payment `SUCCEEDED`, chuyển Order sang `PAYMENT_EXCEPTION`; bù `LoyaltyTransaction(VNPAY_COMPENSATION)` sau khi kiểm tra `VNPayRefundRecord`.
- **Hủy Order `PAID` trước pha:** hoàn đúng `quantityDeducted` đã lưu, ghi `OrderCancellation`, điều chỉnh điểm và chống trùng bằng idempotency key. Order chưa từng xuất nguyên liệu thì không hoàn kho.
- Ràng buộc chính: `Ingredient.quantityOnHand >= 0`; `Payment.idempotencyKey` và `transactionRef` unique; tối đa một Payment `SUCCEEDED` cho mỗi Order; `OrderIngredientUsage.quantityRestored <= quantityDeducted`; `LoyaltyTransaction.idempotencyKey` unique; khoản `VNPAY_COMPENSATION` unique theo Payment.

## Phương án đã cân nhắc

- **Prisma:** migration tốt nhưng dự án đã chốt TypeORM và cần khóa pessimistic qua `QueryRunner`; không đổi ORM.
- **Trừ Product khi tạo Order:** bị loại vì trái Domain Class và gây hoàn tồn giả khi Payment thất bại.
- **Khóa lạc quan:** cần retry phức tạp với nhiều nguyên liệu.

## Hệ quả

- **Ưu điểm:** không bán vượt tồn, không xuất/hoàn/cộng điểm hai lần, schema tái tạo được.
- **Hạn chế:** transaction thanh toán/hủy khóa nhiều dòng và phải thống nhất thứ tự khóa.
- **Đánh đổi:** chấp nhận xử lý tuần tự khi cùng Ingredient để đổi lấy tính nhất quán mạnh.
