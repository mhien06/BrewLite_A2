# ADR-002: Backend NestJS theo kiến trúc modular monolith, chia module theo domain

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-15
- **Liên quan:** FR-05 đến FR-22; NFR-04, NFR-09

## Bối cảnh

Các giao dịch tạo đơn, xử lý kết quả thanh toán, trừ/hoàn nguyên liệu và ghi sổ điểm phải nhất quán trong cùng PostgreSQL. BrewLite chỉ phục vụ một cửa hàng, nhóm phát triển nhỏ; tách microservice sẽ làm tăng độ phức tạp của transaction phân tán mà không đem lại lợi ích tương xứng.

## Quyết định

Một ứng dụng NestJS (một process, một database) được chia theo domain:

- `Auth`, `Users`, `Catalog`, `Cart`, `Orders`;
- `Inventory` quản lý `Ingredient.quantityOnHand` (nơi duy nhất lưu tồn kho), `Recipe`, `RecipeIngredient` (đơn vị `MeasurementUnit`) và `OrderIngredientUsage`;
- `Payments` và `VnpayGateway`;
- `Loyalty` quản lý `LoyaltyTransaction` và bù điểm;
- `Scheduler` kích hoạt đối soát và hết hạn qua `PaymentService`;
- các module hạ tầng `Config`, `Logger`, `Health`, `Database`.

Quy tắc:

1. Module khác chỉ gọi qua service/interface được export, không truy cập repository nội bộ.
2. `OrderService` điều phối tạo/hủy đơn; `PaymentService` điều phối xử lý kết quả thanh toán. Các service dùng chung một TypeORM `EntityManager` khi tham gia cùng transaction.
3. Tạo Order chỉ snapshot sản phẩm, lựa chọn và giá; **không trừ hoặc giữ nguyên liệu**.
4. Chỉ Payment `SUCCEEDED` đã xác minh mới được phép kích hoạt transaction trừ `Ingredient.quantityOnHand`, ghi `OrderIngredientUsage`, ghi điểm `EARN` và chuyển Order sang `PAID`. Nếu thiếu nguyên liệu, Payment vẫn `SUCCEEDED` và Order chuyển `PAYMENT_EXCEPTION`.
5. `PromotionModule` vẫn là `«future»`; không đưa vào MVP.

## Phương án đã cân nhắc

- **Microservices:** cần saga/outbox cho Order–Inventory–Loyalty, quá phức tạp cho MVP.
- **Phân lớp thuần kỹ thuật:** dễ tạo import vòng và làm mờ ranh giới nghiệp vụ.

## Hệ quả

- **Ưu điểm:** transaction ACID đơn giản, triển khai một API image, test luồng nghiệp vụ thuận lợi.
- **Hạn chế:** scale theo cả khối; ranh giới module phải được giữ bằng review/lint.
- **Đánh đổi:** không triển khai độc lập từng module để đổi lấy tính nhất quán mạnh và vận hành đơn giản.
