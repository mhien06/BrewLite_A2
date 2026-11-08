# ADR-006: Xử lý hết hạn thanh toán và đối soát bằng job định kỳ trong tiến trình API (@nestjs/schedule)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-11; NFR-09; RR-05

## Bối cảnh
Mỗi yêu cầu thanh toán hết hạn sau 15 phút. Khi hết hạn phải kiểm tra kết quả giao dịch trước khi đổi trạng thái hoặc hoàn tồn; kết quả chưa xác định không được tự hủy hay hoàn tồn. Không có sẵn hạ tầng hàng đợi.

## Quyết định
- `ReconciliationJob` (`@nestjs/schedule`, chạy mỗi phút) tìm `Payment` ở trạng thái `PENDING`/`UNKNOWN` đã quá `expiresAt`, gọi QueryDR rồi chuyển trạng thái: `SUCCESS`, `FAILED`/`EXPIRED` (hoàn tồn đúng một lần), hoặc giữ `UNKNOWN` để đối soát thủ công.
- Kiểm tra hết hạn cũng chạy theo yêu cầu khi khách xem trạng thái hoặc bấm thanh toán lại, nên kết quả đúng ngay cả khi job chưa chạy.
- Mỗi lần xử lý khóa dòng `Payment`/`Order` (`FOR UPDATE SKIP LOCKED`) và chỉ cập nhật khi trạng thái hiện tại còn là `PENDING`/`UNKNOWN`, nên chạy trùng giữa job và yêu cầu người dùng, hoặc giữa hai instance, không gây xử lý đôi.

## Phương án đã cân nhắc
- **BullMQ + Redis:** có retry, trì hoãn theo từng job, nhưng thêm một dịch vụ phải vận hành.
- **pg_cron/cron của hệ điều hành:** tách khỏi ứng dụng nhưng khó đưa vào Docker Compose và khó kiểm thử.

## Hệ quả
- **Ưu điểm:** không thêm hạ tầng; logic nằm cùng code và test; an toàn khi chạy đồng thời nhờ khóa dòng và điều kiện trạng thái.
- **Hạn chế:** độ trễ tối đa khoảng một chu kỳ job; job dừng khi API dừng (được bù bằng kiểm tra theo yêu cầu và khi khởi động lại); mở rộng nhiều instance cần giữ nguyên cơ chế khóa.
