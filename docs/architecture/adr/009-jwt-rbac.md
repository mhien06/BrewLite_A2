# ADR-009: Xác thực JWT và phân quyền theo vai trò (RBAC) kèm kiểm tra quyền sở hữu

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** FR-04, FR-05, FR-06; NFR-02, NFR-03

## Bối cảnh
Có ba vai trò (Khách hàng, Nhân viên quầy, Quản lý). Yêu cầu phân quyền phải được thực thi tại backend ngay cả khi gọi API trực tiếp; API được bảo vệ trả `401` với JWT thiếu/sai/hết hạn và `403` khi thiếu quyền.

## Quyết định
- Đăng nhập trả **JWT access token** (ký HS256, thời hạn ngắn, mặc định 60 phút, cấu hình bằng biến môi trường); MVP không dùng refresh token. Đăng xuất xóa token phía client (theo FR-05).
- Mật khẩu băm bằng **bcrypt**; không ghi log mật khẩu và JWT.
- `JwtAuthGuard` và `RolesGuard` đăng ký **toàn cục**; endpoint công khai (menu, đăng ký, đăng nhập, IPN, health) đánh dấu bằng decorator `@Public()`. Vai trò lấy từ `UserRole` (`CUSTOMER`, `STAFF`, `MANAGER`).
- Quyền sở hữu (khách chỉ xem/thanh toán đơn của mình) kiểm tra trong service, không chỉ dựa vào vai trò; đơn của người khác trả như "không tồn tại".
- Dữ liệu đầu vào kiểm tra bằng `ValidationPipe` (whitelist, từ chối trường lạ).

## Phương án đã cân nhắc
- **Session phía server + cookie:** thu hồi dễ hơn, nhưng thêm kho session và CSRF; ràng buộc Task 1 đã chọn JWT.
- **Lưu token trong cookie httpOnly qua BFF:** an toàn hơn trước XSS nhưng thêm lớp BFF/CSRF, vượt phạm vi MVP.

## Hệ quả
- **Ưu điểm:** stateless, dễ chạy nhiều instance; quy tắc quyền tập trung, khó quên.
- **Hạn chế:** không thu hồi được token trước khi hết hạn; token lưu ở client chịu rủi ro XSS (giảm bằng thời hạn ngắn, CSP, không ghi log token).
