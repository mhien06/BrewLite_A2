# ADR-006: Hết hạn Order, đối soát Payment và thanh toán lại bằng job định kỳ

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-15
- **Liên quan:** FR-07, FR-11, FR-13, FR-17; BR-03, BR-11, BR-12; NFR-09

## Bối cảnh

Order ở trạng thái chờ tối đa 15 phút từ `Order.createdAt` (`Order.expiresAt = createdAt + 15 phút`). Mỗi Payment attempt có `expiresAt` riêng nhưng không vượt `Order.expiresAt`; thanh toán lại không gia hạn Order. Kết quả `PENDING`/`UNKNOWN` phải được đối soát trước khi tự hủy.

## Quyết định

- `ReconciliationJob` (`@nestjs/schedule`, chạy theo chu kỳ) tìm Payment `PENDING`/`UNKNOWN` cần đối soát và Order `PENDING`/`PAYMENT_FAILED` đã quá hạn.
- Job gọi QueryDR qua `PaymentGateway`, khóa lại Order/Payment và xử lý bằng cùng hàm của `PaymentService` với IPN.
- Chỉ tự hủy khi không có Payment `SUCCEEDED` và không còn Payment `PENDING`/`UNKNOWN`: ghi `OrderCancellation(isAutomatic = true)`, trả điểm đã dùng bằng `LoyaltyTransaction(RETURN_REDEEMED)` nếu có; không hoàn kho vì Order chưa thanh toán chưa từng trừ nguyên liệu.
- Không tự hủy Order `PAID` hoặc `PAYMENT_EXCEPTION` theo mốc 15 phút.
- Có thể tạo Payment mới khi attempt trước đã `FAILED`/`EXPIRED`, Order chưa hết hạn và chưa có `SUCCEEDED`; attempt mới không kéo dài hạn Order.
- Kết quả `SUCCEEDED` xác minh được sau hạn vẫn phải xử lý theo trạng thái Order hiện tại: Order còn chờ → `PAID` hoặc `PAYMENT_EXCEPTION`; Order đã `CANCELLED` → giữ `CANCELLED`, không trừ kho, không `EARN`, bù `LoyaltyTransaction(VNPAY_COMPENSATION)` đúng một lần sau khi kiểm tra `VNPayRefundRecord`.
- Mỗi lượt xử lý dùng khóa dòng (`FOR UPDATE`/`SKIP LOCKED`) và idempotency để job, IPN, QueryDR và thao tác người dùng không tạo hiệu ứng trùng.

## Phương án đã cân nhắc

- BullMQ + Redis: có retry/delay tốt nhưng thêm hạ tầng ngoài phạm vi.
- Hủy ngay khi hết 15 phút mà không QueryDR: bị loại vì có thể hủy đơn đã thu tiền.
- Chỉ dựa vào IPN: bị loại vì IPN có thể mất.

## Hệ quả

- **Ưu điểm:** không thêm hạ tầng; Order hết hạn an toàn; thanh toán lại không kéo dài thời gian giữ đơn.
- **Hạn chế:** job dừng khi API dừng; kết quả có thể trễ tối đa một chu kỳ.
- **Đánh đổi:** chấp nhận độ trễ nhỏ để đổi lấy đối soát an toàn và tránh thu tiền/hủy sai.
