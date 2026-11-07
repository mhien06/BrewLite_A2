# Task 2.2 - Sequence Diagram checkout

## Phạm vi

Task được tách thành hai sơ đồ để dễ đọc nhưng vẫn mô tả trọn use-case đã chốt ở Task 1.3:

1. Tạo đơn hàng và trừ tồn kho trong transaction.
2. Thanh toán qua VNPay Sandbox, gồm idempotency, Return URL và IPN.

## Quy tắc nghiệp vụ đã đồng bộ

- Backend kiểm tra JWT, quyền sở hữu và dữ liệu đầu vào.
- Giá được tính lại ở backend; tồn kho được quản lý theo Product.
- Order và OrderItem snapshot được tạo cùng thao tác trừ tồn trong transaction.
- Order mới ở trạng thái `Chờ thanh toán`; hạn 15 phút chỉ bắt đầu khi tạo Payment.
- Cùng idempotency key và cùng nội dung trả lại lần xử lý cũ; khác nội dung trả 409.
- Return URL chỉ dùng để đưa khách về ứng dụng; IPN đã xác minh mới quyết định kết quả.
- Thành công cập nhật Payment và Order, không hoàn tồn kho.
- Thất bại đã xác minh hoàn tồn đúng một lần và giữ Order ở trạng thái `Chờ thanh toán`.
- Kết quả chưa xác định giữ trạng thái chờ, không hoàn tồn và không cho thanh toán lại.
- Thanh toán lại dùng Payment mới, key mới, hạn mới và kiểm tra/trừ lại tồn kho nguyên tử.
- Không có hoàn tiền trong MVP.

## Tệp bàn giao

- `sequence-create-order.puml`
- `sequence-payment-vnpay.puml`
- `sequence-checkout.drawio`
- `sequence-checkout-1.svg`
- `sequence-checkout-2.svg`
- `sequence-checkout.svg`

Các tệp trong thư mục này là bản kiểm tra cục bộ, chưa commit và chưa push.
