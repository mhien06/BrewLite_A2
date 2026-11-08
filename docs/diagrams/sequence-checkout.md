# Task 2.2 – Sequence Diagram Checkout và Thanh toán VNPay Sandbox

Tài liệu mô tả sơ đồ trình tự (Sequence Diagram) thống nhất cho luồng đặt đơn và thanh toán qua VNPay Sandbox của hệ thống **BrewLite** (đối chiếu trực tiếp từ `docs/requirements/srs.md` và `docs/requirements/use-case-checkout.md`).

---

## 1. Phạm vi và thành phần tham gia (Lifelines)

Sơ đồ trình tự checkout thống nhất mô tả trọn vẹn hai giai đoạn nghiệp vụ cốt lõi:
1. **Giai đoạn 1 – Tạo đơn hàng và trừ tồn kho nguyên tử (UC-07):** Từ lúc khách hàng chọn đặt đơn trên giỏ hàng đến khi backend kiểm tra, tính lại giá, trừ tồn kho theo `Product` và lưu `Order` (`Chờ thanh toán`) kèm `OrderItem` snapshot trong một database transaction.
2. **Giai đoạn 2 & 3 – Khởi tạo thanh toán, xử lý Return URL / IPN và thanh toán lại qua VNPay Sandbox (UC-08):** Từ lúc khách hàng khởi tạo thanh toán kèm phương thức thanh toán và `idempotencyKey`, chuyển hướng sang cổng thanh toán thử nghiệm, xử lý hai tương tác độc lập (Return URL và IPN), đến khi UI lấy trạng thái đã xác minh để hiển thị kết quả cuối cùng cho khách hàng.

### Danh sách Lifelines trên sơ đồ

| STT | Lifeline | Loại | Vai trò trong luồng Checkout |
| :-: | :--- | :--- | :--- |
| 1 | `Customer` | Actor | Khách hàng đã đăng nhập; khởi tạo đặt đơn, khởi tạo thanh toán, thao tác trên trang VNPay Sandbox và nhận kết quả cuối cùng. |
| 2 | `Next.js UI` | Participant | Giao diện web/PWA phía client; gửi yêu cầu đặt đơn/thanh toán kèm JWT, chuyển hướng trình duyệt, truy vấn trạng thái từ backend và hiển thị kết quả. |
| 3 | `NestJS API` | Participant | Backend xử lý xác thực/phân quyền, tính lại giá, điều phối transaction tồn kho/đơn hàng, quản lý idempotency, tạo URL thanh toán và xác minh IPN. |
| 4 | `Database` | Database | Hệ quản trị cơ sở dữ liệu quan hệ (PostgreSQL); đảm bảo khóa bản ghi và thực thi giao dịch nguyên tử (`BEGIN` / `COMMIT` / `ROLLBACK`). |
| 5 | `VNPay Sandbox «Payment Service»` | External Service | Dịch vụ thanh toán mô phỏng bên ngoài ranh giới BrewLite (ACT-04); hiển thị trang thanh toán thử nghiệm, chuyển hướng Return URL và gửi IPN callback. |

---

## 2. Chi tiết luồng tương tác theo giai đoạn

### 2.1. Giai đoạn 1 – Tạo đơn hàng và trừ tồn kho nguyên tử

- **Kiểm tra đầu vào và quyền truy cập:**
  - `Customer` chọn **Đặt đơn từ giỏ hàng** trên `Next.js UI`.
  - `Next.js UI` gọi `POST /orders` kèm `JWT` và danh sách các dòng giỏ hàng (`productId`, `quantity`, `size`, `topping`).
  - `NestJS API` kiểm tra tính hợp lệ của `JWT`, vai trò `CUSTOMER` và dữ liệu giỏ hàng (`productId`, `quantity`, `size`, `topping`). Nếu không hợp lệ, API trả ngay `401 / 400` mà không truy cập `Database`.
- **Tính lại giá và kiểm tra/trừ tồn kho trong một transaction:**
  - Khi dữ liệu hợp lệ, `NestJS API` mở transaction (`BEGIN`), khóa các bản ghi `Product` liên quan, đọc giá hiện hành, tùy chọn hợp lệ và số lượng tồn kho.
  - Backend tự tính lại đơn giá, phụ phí tùy chọn, tổng tiền chính thức và cộng dồn số lượng theo từng `Product` (không tin giá tạm tính từ client; size/topping không có tồn kho riêng).
  - **Nhánh đủ tồn kho:** Lưu `Order` với `status = PENDING_PAYMENT`, `paymentStatus = UNPAID` (cùng `subtotal`, `discountAmount = 0`, `totalAmount`), lưu các bản ghi `OrderItem` snapshot (`productName`, `size`, `topping`, `unitPrice`, `quantity`), trừ `Product.inventoryQuantity` và `COMMIT`. Đơn được nhận diện bằng `Order.id` (không có thuộc tính `orderCode`). Thời hạn thanh toán 15 phút **chưa bắt đầu** ở bước này.
  - **Nhánh thiếu tồn kho hoặc lỗi transaction:** Thực hiện `ROLLBACK` toàn bộ, đảm bảo không tạo đơn dở dang và không trừ tồn kho một phần; trả `409 Conflict` (hoặc lỗi tương ứng) để UI thông báo cho khách hàng.

### 2.2. Giai đoạn 2 – Khởi tạo thanh toán VNPay Sandbox và Idempotency

- **Yêu cầu khởi tạo thanh toán:**
  - `Customer` chọn thanh toán đơn hàng qua VNPay Sandbox.
  - `Next.js UI` gửi `POST /orders/{id}/payments` kèm `JWT`, nhà cung cấp thanh toán (`provider=VNPAY_SANDBOX`) và khóa chống gửi lặp (`idempotencyKey`).
  - `NestJS API` kiểm tra `JWT`, quyền sở hữu đơn, `provider` và truy vấn `Database` để kiểm tra `Order.status`, `Order.paymentStatus`, các `Payment` hiện có cùng `Payment.idempotencyKey`.
- **Phân nhánh kiểm soát Idempotency và điều kiện thanh toán:**
  1. **Cùng `idempotencyKey` và cùng nội dung yêu cầu:** Trả lại đúng URL thanh toán, trạng thái đang xử lý hoặc kết quả đã lưu của lần gọi trước (`200 OK`); không tạo `Payment` mới.
  2. **Cùng `idempotencyKey` nhưng khác đơn hoặc khác nội dung:** Từ chối với `409 Conflict`, không thay đổi dữ liệu.
  3. **Đã tồn tại `Payment` ở trạng thái `PENDING / UNKNOWN` (`Order.paymentStatus = PENDING / UNKNOWN`) hoặc `Order.status` không còn là `PENDING_PAYMENT`:** Chặn tạo `Payment` mới (`409 Conflict`), giữ nguyên giao dịch đang chờ xác minh để tránh tạo giao dịch trùng hoặc hoàn/trừ tồn sai lệch.
- **Xử lý hết hạn / thanh toán lại và tạo `Payment` mới:**
  - **Xác minh hết hạn trước khi hoàn tồn (fragment `opt`):** Nếu `Payment` trước đã quá 15 phút nhưng chưa đóng trạng thái, backend gọi `QueryDR` đối soát giao dịch trước (`transactionRef`). Nếu `QueryDR` báo `SUCCESS` thì ghi `Payment.status = SUCCESS`, `Order.status = PAID`, `Order.paymentStatus = SUCCESS`; nếu chưa xác minh được thì ghi `UNKNOWN` (cả `Payment.status` và `Order.paymentStatus`) và trả `409 Conflict`. Chỉ khi đã xác minh không thành công mới ghi `Payment.status = EXPIRED`, `Order.paymentStatus = EXPIRED` và hoàn tồn kho đúng một lần trong transaction.
  - **Thanh toán lại sau khi `Payment` trước đã xác minh `Thất bại / Hết hạn` (fragment `opt` và `break`):** Backend khóa `Order`, đọc giá và tùy chọn hiện hành, tính lại tổng tiền, kiểm tra tồn kho hiện tại theo `Product`, rồi cập nhật `Order.totalAmount` bằng tổng tiền vừa tính lại. Nếu thiếu tồn kho, hệ thống `ROLLBACK`, trả `409 Conflict` và không tạo `Payment` mới. Nếu đủ tồn kho, hệ thống giữ/trừ lại tồn kho trong cùng transaction.
  - **Tạo `Payment` và kết thúc kích hoạt API khởi tạo:** Lần thanh toán đầu dùng tổng tiền chính thức đã lưu trên đơn; lần thanh toán lại dùng tổng tiền vừa tính lại. Hệ thống tạo `Payment` (`provider = VNPAY_SANDBOX`, `status = PENDING`, `idempotencyKey`, `amount`, `transactionRef` mới, `expiresAt` = +15 phút), cập nhật `Order.paymentStatus = PENDING`, `COMMIT`, tạo URL VNPay Sandbox có chữ ký và trả URL cho `Next.js UI`.
  - **Quy tắc Activation Bar:** Activation bar của `NestJS API` cho yêu cầu `POST /orders/{id}/payments` kết thúc ngay sau khi trả response tạo URL, không kéo dài sang thời gian khách hàng thao tác trên cổng VNPay.
- **Chuyển hướng và thao tác tại VNPay Sandbox:**
  - `Next.js UI` chuyển hướng trình duyệt của khách sang `VNPay Sandbox «Payment Service»`.
  - `Customer` xem trang thanh toán thử nghiệm và xác nhận giao dịch trên `VNPay Sandbox`.

### 2.3. Giai đoạn 3 – Hai tương tác độc lập (Return URL và IPN) và cập nhật kết quả cuối cùng

Việc trình duyệt quay về `Return URL` và việc `VNPay Sandbox` gọi `IPN` tới backend là **hai tương tác độc lập**, không có thứ tự cố định và không bắt buộc cùng xảy ra. Sơ đồ tổng quát biểu diễn hai nhánh trong fragment `par`; mỗi nhánh dùng `opt` để thể hiện tương tác có thể không xảy ra.

- **Tương tác độc lập A – Khách quay về qua Return URL:**
  - `VNPay Sandbox` chuyển hướng trình duyệt về `Return URL` trên `Next.js UI` (có thể xảy ra trước IPN, sau IPN, hoặc không xảy ra nếu khách đóng trình duyệt).
  - `Next.js UI` **không dùng tham số trên Return URL làm căn cứ xác nhận thanh toán**, mà gọi `GET /orders/{id}/payment-status` tới `NestJS API` (kích hoạt một activation bar riêng trên `NestJS API`).
  - `NestJS API` đọc trạng thái thực tế từ `Database` và trả về cho UI hiển thị kết quả đã xác minh hoặc trạng thái `Đang xác minh`.
- **Tương tác độc lập B – VNPay Sandbox gửi IPN bất đồng bộ:**
  - IPN là kênh thông báo bất đồng bộ chính. Nếu chưa nhận được IPN hoặc kết quả giao dịch chưa rõ, hệ thống dùng `QueryDR` để đối soát với VNPay Sandbox; vì vậy IPN không được mô tả là căn cứ duy nhất.
  - `VNPay Sandbox` gửi `POST IPN` (gồm `transactionRef`, số tiền, mã kết quả, chữ ký) tới `NestJS API` (kích hoạt một activation bar riêng trên `NestJS API`).
  - `NestJS API` kiểm tra chữ ký, đối chiếu `transactionRef`, số tiền và đọc trạng thái `Order` / `Payment` hiện tại từ `Database`, sau đó xử lý theo **5 nhánh rõ ràng (`alt`)**. `Order.paymentStatus` luôn được cập nhật cùng `Payment.status` trong cùng transaction:
    1. **IPN / chữ ký không hợp lệ, sai tham chiếu hoặc sai số tiền:** Từ chối thông báo, ghi log cảnh báo bảo mật và **không thay đổi Database**.
    2. **IPN gửi lặp khi `Payment` đã ở trạng thái cuối (`SUCCESS / FAILED / EXPIRED`):** Đảm bảo tính idempotent cho IPN — bỏ qua cập nhật lặp, **không cập nhật `Payment`, `Order` hoặc tồn kho lần thứ hai**.
    3. **IPN hợp lệ và giao dịch `Thành công`:** Trong một transaction (`BEGIN` ... `COMMIT`), khóa `Order` và `Payment`, cập nhật `Payment.status = SUCCESS` (ghi `providerTransactionNo`, `responseCode`, `verifiedAt`), chuyển `Order.status = PAID` và `Order.paymentStatus = SUCCESS` đúng một lần, giữ nguyên tồn kho đã trừ.
    4. **IPN hợp lệ nhưng giao dịch thất bại:** Trong một transaction (`BEGIN` ... `COMMIT`), khóa `Order` và `Payment`, cập nhật `Payment.status = FAILED` và `Order.paymentStatus = FAILED` (ghi `responseCode`, `verifiedAt`), **hoàn tồn kho đúng một lần** và giữ `Order.status = PENDING_PAYMENT` để khách có thể thanh toán lại. (`EXPIRED` do backend xác minh ở bước thanh toán lại, không phát sinh từ IPN.)
    5. **Kết quả chưa xác định hoặc cần đối soát thêm:** Ghi `Payment.status = UNKNOWN` và `Order.paymentStatus = UNKNOWN` (Chờ xác minh), không hoàn tồn kho và không đánh dấu thành công.
  - Ở cuối luồng IPN, `NestJS API` trả `RspCode` theo quy ước tích hợp VNPay và kết thúc activation bar xử lý IPN.
- **Luồng UI lấy trạng thái đã xác minh sau khi IPN được xử lý:**
  - Sau khi IPN hoàn tất xử lý tại backend, `Next.js UI` gọi `GET /orders/{id}/payment-status` (kích hoạt activation bar riêng trên `NestJS API`) để đọc `Order.status`, `Order.paymentStatus` và `Payment` đã được xác minh từ `Database`.
  - `Next.js UI` hiển thị kết quả thanh toán cuối cùng cho `Customer` (`PAID` nếu thành công, hoặc thông báo `FAILED` / `EXPIRED` kèm tùy chọn **Thanh toán lại** trên cùng đơn hàng; `UNKNOWN` hiển thị `Đang xác minh`).

---

## 3. Danh sách tệp bàn giao

- **Nguồn PlantUML của sơ đồ tổng quát:** `docs/diagrams/sources/sequence-checkout.puml`
- **Bản xuất SVG thống nhất (chính):** `docs/diagrams/exports/sequence-checkout.svg`
- **Tài liệu mô tả sơ đồ:** `docs/diagrams/sequence-checkout.md`
- **Nguồn PlantUML của hai sơ đồ chi tiết:**
  - `docs/diagrams/sources/sequence-create-order.puml`
  - `docs/diagrams/sources/sequence-payment-vnpay.puml`

