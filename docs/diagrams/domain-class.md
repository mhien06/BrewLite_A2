# Domain Class Diagram – BrewLite

Tài liệu giải thích ngắn gọn domain model trong `domain-class.drawio` (Task 2.3). Nguồn nghiệp vụ: `context-and-scope.md`, `srs.md`, `use-case-checkout.md`. Tệp nguồn Draw.io và bản xuất SVG đã được lưu trong repository.

## 1. Phạm vi domain model

- Mô hình hóa **dữ liệu nghiệp vụ cốt lõi** của MVP một cửa hàng: tài khoản, menu, giỏ hàng, đơn hàng và thanh toán.
- Gồm 8 class MVP, 2 class `«future»` (nét đứt) và 9 enum.
- Chỉ có class, attribute, enum, association, composition và multiplicity. Không có method; không có Controller, Service, Repository, API, Database, Next.js hay NestJS.
- Enum không nối bằng connector; chúng là kiểu của attribute (ví dụ `Order.status: OrderStatus`).
- Hình thoi đặc nằm ở phía "toàn thể" (Cart, Product, Order); mũi tên mở là navigable association.
- **VNPay Sandbox nằm ngoài domain model** (xem mục 8).

## 2. Ý nghĩa các class

| Class | Ý nghĩa |
| :--- | :--- |
| `User` | Tài khoản của Khách hàng, Nhân viên quầy hoặc Quản lý (`role: UserRole`). Chỉ lưu `passwordHash`, không lưu mật khẩu gốc. |
| `Product` | Đồ uống bán trong menu. `inventoryQuantity` là **tồn kho duy nhất** của hệ thống. |
| `ProductOption` | Lựa chọn size hoặc topping của một Product (`type: ProductOptionType`) kèm `additionalPrice`. Không có tồn riêng. |
| `Cart` | Giỏ hàng của User (tối đa một). |
| `CartItem` | Một dòng trong giỏ: Product, `quantity`, size, topping và `estimatedUnitPrice`. Đây chỉ là **giá tạm tính**; backend tính lại khi tạo Order. |
| `Order` | Đơn đặt đồ uống nhận tại quầy. `status` thể hiện tiến trình của đơn; trạng thái của từng lần thanh toán được quản lý tại `Payment.status`. Tiền (`subtotal`, `discountAmount`, `totalAmount`) do backend tính. |
| `OrderItem` | Một dòng của Order, lưu **snapshot** tên sản phẩm, size, topping và đơn giá tại thời điểm đặt để lịch sử không thay đổi. |
| `Payment` | Một lượt thanh toán của Order qua `provider`. Có `transactionRef`, `idempotencyKey`, `expiresAt` (15 phút) và `verifiedAt` riêng. |
| `Promotion` `«future»` | Chương trình khuyến mãi (mã, loại, giá trị, thời gian hiệu lực, trạng thái). |
| `LoyaltyTransaction` `«future»` | Giao dịch điểm tích lũy của User, có thể gắn với một Order. |

**Enum:** `UserRole` (CUSTOMER, STAFF, MANAGER), `UserStatus` (ACTIVE, INACTIVE), `ProductOptionType` (SIZE, TOPPING), `OrderStatus` (PENDING_PAYMENT, PAID, PREPARING, READY_FOR_PICKUP, COMPLETED, CANCELLED), `PaymentStatus` (PENDING, SUCCESS, FAILED, UNKNOWN, EXPIRED), `PaymentProvider` (VNPAY_SANDBOX), `PromotionType` (FIXED_AMOUNT, PERCENTAGE), `PromotionStatus` (DRAFT, ACTIVE, INACTIVE, EXPIRED), `LoyaltyTransactionType` (EARN, REDEEM, ADJUST).

## 3. Quan hệ và multiplicity

Multiplicity nằm cạnh class mà nó mô tả. Ví dụ `User 1 — 0..1 Cart`: mỗi User có 0..1 Cart, mỗi Cart thuộc đúng 1 User.

| # | Quan hệ | Loại | Ý nghĩa |
| :-: | :--- | :--- | :--- |
| 1 | `User 1 — 0..1 Cart` | Association | Mỗi User có tối đa một Cart. |
| 2 | `Cart 1 ◆— 0..* CartItem` | Composition | CartItem chỉ tồn tại trong Cart; Cart có thể rỗng. |
| 3 | `CartItem 0..* → 1 Product` | Navigable association | Mỗi CartItem tham chiếu đúng một Product. |
| 4 | `Product 1 ◆— 0..* ProductOption` | Composition | Size, topping thuộc về Product. |
| 5 | `User 1 — 0..* Order` | Association | Mỗi Order thuộc đúng một User. |
| 6 | `Order 1 ◆— 1..* OrderItem` | Composition | Order phải có ít nhất một OrderItem. |
| 7 | `OrderItem 0..* → 1 Product` | Navigable association | Trỏ về Product gốc; dữ liệu lịch sử nằm ở các trường snapshot. |
| 8 | `Order 1 ◆— 0..* Payment` | Composition | Order mới chưa có Payment; có thể có nhiều Payment (mục 6). |
| 9 | `Promotion 0..1 — 0..* Order` | Association (future) | Mỗi Order áp dụng tối đa một Promotion. |
| 10 | `User 1 — 0..* LoyaltyTransaction` | Association (future) | Mỗi giao dịch điểm thuộc đúng một User. |
| 11 | `Order 0..1 — 0..* LoyaltyTransaction` | Association (future) | Giao dịch điểm có thể gắn với một Order hoặc không. |

## 4. Vòng đời Order

`PENDING_PAYMENT → PAID → PREPARING → READY_FOR_PICKUP → COMPLETED`

- Order được tạo ở `PENDING_PAYMENT`, cùng lúc với OrderItem và việc trừ tồn kho (một transaction).
- Payment `SUCCESS` đã xác minh mới chuyển Order sang `PAID`, đúng một lần.
- Payment `FAILED` hoặc `EXPIRED` đã xác minh: Order **vẫn ở `PENDING_PAYMENT`** để khách thanh toán lại.
- Từ `PAID`, Nhân viên quầy/Quản lý chuyển tuần tự từng bước; không bỏ bước, không quay lui.
- `CANCELLED`: đơn đã hủy, không được tạo Payment mới. Tài liệu nguồn chưa quy định điều kiện chuyển sang `CANCELLED`; MVP không có khách tự hủy đơn đã thanh toán và không hoàn tiền.

## 5. Vòng đời Payment

| `PaymentStatus` | Ý nghĩa | Tồn kho | Payment mới |
| :--- | :--- | :--- | :--- |
| `PENDING` | Đã tạo yêu cầu (hạn 15 phút), chưa có kết quả đáng tin cậy. | Không hoàn | **Chặn** |
| `UNKNOWN` | Chưa xác định được kết quả (IPN chậm/không đến, lỗi mạng) hoặc cần đối soát thủ công. | Không hoàn | **Chặn** |
| `SUCCESS` | Backend đã xác minh chữ ký, mã tham chiếu, số tiền và mã kết quả; Order → `PAID`. | Giữ nguyên | Không cho |
| `FAILED` | Kết quả thất bại đã được xác minh. | Hoàn đúng một lần | Cho phép |
| `EXPIRED` | Quá `expiresAt`, backend đã kiểm tra và không có kết quả thành công hợp lệ. | Hoàn đúng một lần | Cho phép |

- Chỉ có **một Payment `SUCCESS` hợp lệ** cho mỗi Order.
- Return URL chỉ dùng hiển thị; không phải bằng chứng thanh toán.
- Kết quả thành công đến muộn: nếu Order còn `PENDING_PAYMENT` và cập nhật được an toàn thì Order → `PAID`; nếu không, ghi nhận để đối soát thủ công, không ghi đè dữ liệu.

## 6. Vì sao một Order có nhiều Payment

- Mỗi lần thanh toán là một yêu cầu riêng với VNPay Sandbox, có `transactionRef`, `idempotencyKey` và `expiresAt` mới; không dùng lại của lượt trước.
- Khi lượt trước `FAILED` hoặc `EXPIRED`, Order vẫn `PENDING_PAYMENT` nên khách được thử lại. Cần giữ từng lượt để truy vết và đối soát.
- Vì vậy multiplicity là `Order 1 ◆— 0..* Payment`. Các quy tắc giữ cho dữ liệu nhất quán: tối đa một `SUCCESS`; `PENDING`/`UNKNOWN` chặn lượt mới.
- Payment là composition vì không tồn tại ngoài Order.

## 7. Tồn kho

- Tồn kho chỉ quản lý theo `Product.inventoryQuantity`; size/topping không có tồn riêng.
- Tạo Order: cộng số lượng theo từng Product, đủ tồn thì tạo Order + OrderItem + trừ tồn trong một transaction; thiếu tồn ở bất kỳ dòng nào thì không tạo đơn, không trừ một phần.
- Hoàn tồn đúng một lần khi Payment `FAILED`/`EXPIRED` đã xác minh. `PENDING`/`UNKNOWN` không hoàn.
- Thanh toán lại: tính lại tổng tiền, kiểm tra và giữ/trừ lại tồn trước khi tạo Payment mới; không đủ tồn thì không tạo Payment mới.

## 8. Hai class future và ranh giới VNPay Sandbox

**`Promotion` và `LoyaltyTransaction`** nằm ngoài MVP (`context-and-scope.md` §6: chưa cam kết hiện thực). Chúng được vẽ nét đứt với `«future»` để định hướng mở rộng; MVP không phụ thuộc vào chúng.

**VNPay Sandbox không phải domain entity.**

- Đây là Payment Service mô phỏng bên ngoài ranh giới BrewLite (ACT-04), không vẽ thành class.
- BrewLite chỉ lưu dấu vết giao dịch trong `Payment`: `provider = VNPAY_SANDBOX`, `transactionRef`, `providerTransactionNo`, `responseCode`, `verifiedAt`. `PaymentProvider` chỉ là enum định danh nhà cung cấp.
- Return URL, IPN, chữ ký và đối soát là hành vi xử lý của UC-08, không phải dữ liệu miền.
- Không lưu số thẻ, CVV hoặc thông tin ngân hàng.

## 9. Quyết định và giả định mô hình (cần team xác nhận)

- Chỉ dùng class/attribute theo yêu cầu mới; không mang từ sơ đồ cũ các phần mâu thuẫn (ProductSize, Topping, OrderItemTopping, PaymentMethod, `stockRestoredAt`, `requestHash`).
- `CartItem` và `OrderItem` lưu size/topping dạng `String` nên không có association tới `ProductOption`; backend đối chiếu khi tạo Order.
- Các attribute khóa (`userId`, `orderId`, `productId`...) giữ theo yêu cầu, bên cạnh association. `Order` không có `promotionId`; liên kết với Promotion chỉ thể hiện bằng association.
- Trạng thái của từng lần thanh toán chỉ được lưu tại `Payment.status`; `Order.status` thể hiện tiến trình của đơn.
- Trạng thái "cần đối soát thủ công" được biểu diễn bằng `UNKNOWN`, không thêm giá trị enum.
- "Hoàn tồn đúng một lần" dựa vào việc Payment chuyển sang `FAILED`/`EXPIRED` trong cùng transaction với thao tác hoàn tồn, không thêm attribute cờ.
- Trong MVP chưa có Promotion nên `Order.discountAmount` mặc định `0`.
