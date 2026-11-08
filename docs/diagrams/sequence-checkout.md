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

### 2.1. Giai đoạn 1 – Tạo đơn hàng và trừ tồn kho nguyên tử (Bước 1 – 16)

- **Kiểm tra đầu vào và quyền truy cập (Bước 1 – 3, 15 – 16):**
  - `Customer` chọn **Đặt đơn từ giỏ hàng** trên `Next.js UI`.
  - `Next.js UI` gọi `POST /orders` kèm `JWT` và danh sách các dòng giỏ hàng (`Product`, `size`, `topping`, `số lượng`).
  - `NestJS API` kiểm tra tính hợp lệ của `JWT`, vai trò `Customer` và dữ liệu giỏ hàng. Nếu không hợp lệ, API trả ngay `401 / 403 / 400` mà không truy cập `Database`.
- **Tính lại giá và kiểm tra/trừ tồn kho trong một transaction (Bước 4 – 14):**
  - Khi dữ liệu hợp lệ, `NestJS API` mở transaction (`BEGIN`), khóa các bản ghi `Product` liên quan, đọc giá hiện hành, tùy chọn hợp lệ và số lượng tồn kho.
  - Backend tự tính lại đơn giá, phụ phí tùy chọn, tổng tiền chính thức và cộng dồn số lượng theo từng `Product` (không tin giá tạm tính từ client; size/topping không có tồn kho riêng).
  - **Nhánh đủ tồn kho (Bước 7 – 11):** Lưu `Order` ở trạng thái `Chờ thanh toán`, lưu các bản ghi `OrderItem` snapshot (tên sản phẩm, size, topping, đơn giá tại thời điểm đặt), trừ tồn kho theo `Product` và `COMMIT`. Thời hạn thanh toán 15 phút **chưa bắt đầu** ở bước này.
  - **Nhánh thiếu tồn kho hoặc lỗi transaction (Bước 12 – 14):** Thực hiện `ROLLBACK` toàn bộ, đảm bảo không tạo đơn dở dang và không trừ tồn kho một phần; trả `409 Conflict` (hoặc lỗi tương ứng) để UI thông báo cho khách hàng.

### 2.2. Giai đoạn 2 – Khởi tạo thanh toán VNPay Sandbox và Idempotency (Bước 17 – 44)

- **Yêu cầu khởi tạo thanh toán (Bước 17 – 21):**
  - `Customer` chọn thanh toán đơn hàng qua VNPay Sandbox.
  - `Next.js UI` gửi `POST /orders/{id}/payments` kèm `JWT`, phương thức thanh toán (`paymentMethod=VNPAY_SANDBOX`) và khóa chống gửi lặp (`idempotencyKey`).
  - `NestJS API` kiểm tra `JWT`, quyền sở hữu đơn, phương thức thanh toán và truy vấn `Database` để kiểm tra trạng thái `Order`, các `Payment` hiện có cùng `idempotencyKey`.
- **Phân nhánh kiểm soát Idempotency và điều kiện thanh toán (Bước 22 – 27):**
  1. **Cùng `idempotencyKey` và cùng nội dung yêu cầu (Bước 22 – 23):** Trả lại đúng URL thanh toán, trạng thái đang xử lý hoặc kết quả đã lưu của lần gọi trước (`200 OK`); không tạo `Payment` mới.
  2. **Cùng `idempotencyKey` nhưng khác đơn hoặc khác nội dung (Bước 24 – 25):** Từ chối với `409 Conflict`, không thay đổi dữ liệu.
  3. **Đã tồn tại `Payment` đang ở trạng thái `Chờ xử lý / Chờ xác minh` (hoặc `Order` không còn ở trạng thái hợp lệ) (Bước 26 – 27):** Chặn tạo `Payment` mới (`409 Conflict`), giữ nguyên giao dịch đang chờ xác minh để tránh tạo giao dịch trùng hoặc hoàn/trừ tồn sai lệch.
- **Xử lý hết hạn / thanh toán lại và tạo `Payment` mới (Bước 28 – 41):**
  - **Xác minh hết hạn trước khi hoàn tồn (Bước 28 – 29, fragment `opt`):** Nếu `Payment` trước đã quá 15 phút nhưng chưa đóng trạng thái, backend phải đối soát/xác minh kết quả giao dịch trước đủ tin cậy là `Hết hạn` rồi mới ghi nhận `Payment` `Hết hạn` và hoàn tồn kho đúng một lần trong transaction.
  - **Thanh toán lại sau khi `Payment` trước đã xác minh `Thất bại / Hết hạn` (Bước 30 – 36, fragment `opt` & `break`):** Khi khách thanh toán lại cho đơn `Chờ thanh toán` đã được hoàn tồn trước đó, backend khóa `Order`, tính lại tổng tiền và kiểm tra tồn kho hiện tại theo `Product`. Nếu thiếu tồn kho (`break`), thực hiện `ROLLBACK`, trả `409 Conflict` và không tạo `Payment` mới. Nếu đủ tồn kho, giữ/trừ lại tồn kho theo `Product` ngay trong cùng transaction.
  - **Tạo `Payment` và kết thúc kích hoạt API khởi tạo (Bước 37 – 41):** Tạo bản ghi `Payment` mới ở trạng thái `Chờ xử lý` (`VNPAY_SANDBOX`) với `transactionRef` mới và thời hạn 15 phút (`expiresAt`), thực hiện `COMMIT`, tạo URL VNPay Sandbox có chữ ký bảo mật và trả `200 OK` kèm URL cho `Next.js UI`.
  - **Quy tắc Activation Bar:** Activation bar của `NestJS API` cho yêu cầu `POST /orders/{id}/payments` **kết thúc ngay sau khi trả response tạo URL (Bước 41)**, không kéo dài sang thời gian khách hàng thao tác trên cổng VNPay.
- **Chuyển hướng và thao tác tại VNPay Sandbox (Bước 42 – 44):**
  - `Next.js UI` chuyển hướng trình duyệt của khách sang `VNPay Sandbox «Payment Service»`.
  - `Customer` xem trang thanh toán thử nghiệm và xác nhận giao dịch trên `VNPay Sandbox`.

### 2.3. Giai đoạn 3 – Hai tương tác độc lập (Return URL và IPN) & Cập nhật kết quả cuối cùng (Bước 45 – 67)

Việc trình duyệt quay về `Return URL` và việc `VNPay Sandbox` gọi `IPN` tới backend là **hai tương tác độc lập**, không có thứ tự cố định và không bắt buộc cùng xảy ra (được biểu diễn bằng các fragment `opt` độc lập, không dùng `par` đồng thời):

- **Tương tác độc lập A – Khách quay về qua Return URL (Bước 45 – 50):**
  - `VNPay Sandbox` chuyển hướng trình duyệt về `Return URL` trên `Next.js UI` (có thể xảy ra trước IPN, sau IPN, hoặc không xảy ra nếu khách đóng trình duyệt).
  - `Next.js UI` **không dùng tham số trên Return URL làm căn cứ xác nhận thanh toán**, mà gọi `GET /orders/{id}/payment-status` tới `NestJS API` (kích hoạt một activation bar riêng trên `NestJS API`).
  - `NestJS API` đọc trạng thái thực tế từ `Database` và trả về cho UI hiển thị kết quả đã xác minh hoặc trạng thái `Đang xác minh`.
- **Tương tác độc lập B – VNPay Sandbox gửi IPN bất đồng bộ (Bước 51 – 62):**
  - `VNPay Sandbox` gửi `POST IPN` (gồm `transactionRef`, số tiền, mã kết quả, chữ ký) tới `NestJS API` (kích hoạt một activation bar riêng trên `NestJS API`).
  - `NestJS API` kiểm tra chữ ký, đối chiếu `transactionRef`, số tiền và đọc trạng thái `Order` / `Payment` hiện tại từ `Database`, sau đó xử lý theo **5 nhánh rõ ràng (`alt`)**:
    1. **IPN / chữ ký không hợp lệ, sai tham chiếu hoặc sai số tiền (Bước 55):** Từ chối thông báo, ghi log cảnh báo bảo mật và **không thay đổi Database**.
    2. **IPN gửi lặp khi `Payment` đã ở trạng thái cuối (`Thành công / Thất bại / Hết hạn`) (Bước 56):** Đảm bảo tính idempotent cho IPN — bỏ qua cập nhật lặp, **không cập nhật `Payment`, `Order` hoặc tồn kho lần thứ hai**.
    3. **IPN hợp lệ và giao dịch `Thành công` (Bước 57 – 58):** Trong một transaction (`BEGIN` ... `COMMIT`), khóa `Order` và `Payment`, cập nhật `Payment` sang `Thành công`, chuyển `Order` sang `Đã thanh toán` đúng một lần và giữ nguyên tồn kho đã trừ.
    4. **IPN hợp lệ nhưng giao dịch `Thất bại` (hoặc xác minh `Hết hạn`) (Bước 59 – 60):** Trong một transaction (`BEGIN` ... `COMMIT`), khóa `Order` và `Payment`, cập nhật `Payment` sang `Thất bại` (hoặc `Hết hạn`), **hoàn tồn kho đúng một lần** và giữ `Order` ở trạng thái `Chờ thanh toán` để khách có thể thanh toán lại.
    5. **Kết quả chưa xác định hoặc cần đối soát thêm (Bước 61):** Giữ `Payment` ở trạng thái `Chờ xử lý / Chờ xác minh`, không hoàn tồn kho và không đánh dấu thành công.
  - Ở cuối luồng IPN (Bước 62), `NestJS API` trả `RspCode` theo quy ước tích hợp VNPay và kết thúc activation bar xử lý IPN.
- **Luồng UI lấy trạng thái đã xác minh sau khi IPN được xử lý (Bước 63 – 67):**
  - Sau khi IPN hoàn tất xử lý tại backend, `Next.js UI` gọi `GET /orders/{id}/payment-status` (kích hoạt activation bar riêng trên `NestJS API`) để đọc trạng thái `Order` và `Payment` đã được xác minh từ `Database`.
  - `Next.js UI` hiển thị kết quả thanh toán cuối cùng cho `Customer` (`Đã thanh toán` nếu thành công, hoặc thông báo thất bại/hết hạn kèm tùy chọn **Thanh toán lại** trên cùng đơn hàng).

---

## 3. Danh sách tệp bàn giao

- **Sơ đồ nguồn Draw.io (chính):** `docs/diagrams/sources/sequence-checkout.drawio`
- **Bản xuất SVG thống nhất (chính):** `docs/diagrams/exports/sequence-checkout.svg`
- **Tài liệu mô tả sơ đồ:** `docs/diagrams/sequence-checkout.md`
- **Nguồn phụ PlantUML (tham khảo):**
  - `docs/diagrams/sources/sequence-create-order.puml`
  - `docs/diagrams/sources/sequence-payment-vnpay.puml`

