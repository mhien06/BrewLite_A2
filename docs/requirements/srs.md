# Đặc tả yêu cầu phần mềm BrewLite

## 1. Yêu cầu chức năng

Các yêu cầu được ưu tiên theo MoSCoW: **Must** (bắt buộc), **Should** (nên có), **Could** (có thể có), **Won't** (không thuộc MVP). BrewLite phục vụ một cửa hàng, cho phép đặt đồ uống trực tuyến và nhận tại quầy. **VNPay Sandbox đóng vai trò Payment Service mô phỏng bên ngoài**; hệ thống chỉ xử lý giao dịch thử nghiệm, không phát sinh tiền thật và không vận hành thanh toán production.

### 1.1. Menu và sản phẩm

#### FR-01 — Xem danh sách sản phẩm

- **Ưu tiên:** Must.
- **Mô tả:** Người dùng xem menu không cần đăng nhập, gồm tên, giá cơ bản, hình ảnh và tình trạng còn hàng.
- **Tiêu chí chấp nhận:** (1) Danh sách hiển thị từ dữ liệu hệ thống. (2) Giá và tình trạng còn hàng đúng dữ liệu hiện tại. (3) Có trạng thái tải, rỗng và lỗi. (4) Không thể thêm sản phẩm hết hàng vào giỏ.

#### FR-02 — Xem chi tiết và tùy chọn sản phẩm

- **Ưu tiên:** Must.
- **Mô tả:** Người dùng xem mô tả sản phẩm, chọn size, topping và số lượng hợp lệ; giao diện tính giá tạm tính.
- **Tiêu chí chấp nhận:** (1) Hiển thị đúng chi tiết và tùy chọn của sản phẩm tồn tại. (2) Giá tạm tính thay đổi theo lựa chọn. (3) Từ chối size, topping hoặc số lượng không hợp lệ. (4) Sản phẩm không tồn tại được thông báo rõ.

### 1.2. Giỏ hàng

#### FR-03 — Quản lý giỏ hàng

- **Ưu tiên:** Must.
- **Mô tả:** Thêm sản phẩm theo size, topping, số lượng; xem, chỉnh số lượng, xóa dòng sản phẩm và xem tổng tiền tạm tính.
- **Tiêu chí chấp nhận:** (1) Lưu đúng các tùy chọn của từng dòng. (2) Cho phép sửa/xóa dòng hợp lệ. (3) Tổng số lượng và tổng tiền cập nhật sau mỗi thao tác. (4) Không nhận sản phẩm hết hàng hoặc số lượng sai. (5) Giỏ trống không thể đặt đơn.

### 1.3. Xác thực và phân quyền

#### FR-04 — Đăng ký tài khoản khách hàng

- **Ưu tiên:** Must.
- **Mô tả:** Người dùng đăng ký bằng họ tên, email, mật khẩu và xác nhận mật khẩu; tài khoản mới có vai trò Khách hàng.
- **Tiêu chí chấp nhận:** (1) Họ tên sau khi cắt khoảng trắng dài 2–100 ký tự. (2) Email đúng định dạng, tối đa 254 ký tự, được chuẩn hóa chữ thường và không trùng không phân biệt hoa/thường. (3) Mật khẩu dài 8–64 ký tự, có chữ hoa, chữ thường và chữ số; xác nhận phải khớp. (4) Thiếu/sai dữ liệu phải bị từ chối với thông báo phù hợp. (5) Mật khẩu được băm; không lưu xác nhận mật khẩu. (6) Không tự đăng ký vai trò Nhân viên quầy/Quản lý.

#### FR-05 — Đăng nhập, xác thực và đăng xuất

- **Ưu tiên:** Must.
- **Mô tả:** Người dùng đăng nhập để nhận JWT, dùng JWT với API bảo vệ và có thể đăng xuất khỏi giao diện.
- **Tiêu chí chấp nhận:** (1) Thông tin hợp lệ nhận JWT và dữ liệu tài khoản cần thiết. (2) Thông tin sai không nhận JWT. (3) API được bảo vệ từ chối JWT thiếu, sai hoặc hết hạn. (4) Đăng xuất xóa trạng thái đăng nhập và ngừng sử dụng JWT hiện tại trên client.

#### FR-06 — Phân quyền và giới hạn dữ liệu

- **Ưu tiên:** Must.
- **Mô tả:** Backend kiểm soát vai trò Khách hàng, Nhân viên quầy, Quản lý cửa hàng và quyền sở hữu đơn.
- **Tiêu chí chấp nhận:** (1) Khách chỉ xem đơn của mình. (2) Khách không thể cập nhật tiến độ xử lý đơn. (3) Nhân viên/Quản lý chỉ cập nhật theo bước cho phép. (4) Yêu cầu sai quyền bị từ chối ngay tại backend, không lộ dữ liệu được bảo vệ.

### 1.4. Đặt đơn và tồn kho

#### FR-07 — Tạo đơn hàng

- **Ưu tiên:** Must.
- **Mô tả:** Khách hàng đã đăng nhập đặt đơn từ giỏ hợp lệ; backend tính lại giá và lưu snapshot sản phẩm, tùy chọn, số lượng, đơn giá.
- **Tiêu chí chấp nhận:** (1) Từ chối khách chưa đăng nhập, giỏ rỗng hoặc dữ liệu sai. (2) Tổng tiền do backend tính từ dữ liệu hiện hành, không tin giá client. (3) Đơn lưu snapshot tại thời điểm đặt. (4) Đơn bắt đầu ở trạng thái **Chờ thanh toán**. (5) Trả mã đơn, chi tiết, tổng tiền và trạng thái đơn.

#### FR-08 — Kiểm tra và cập nhật tồn kho

- **Ưu tiên:** Must.
- **Mô tả:** Tồn kho quản lý theo Product; tạo đơn và trừ tồn thực hiện nguyên tử trong cùng transaction.
- **Tiêu chí chấp nhận:** (1) Cộng số lượng các dòng cùng Product trước khi kiểm tra. (2) Đủ tồn thì trừ chính xác theo Product. (3) Thiếu tồn ở bất kỳ dòng nào thì không tạo đơn/không trừ một phần. (4) Size và topping không có tồn riêng. (5) Đặt đồng thời không làm tồn âm; transaction lỗi phải rollback.

### 1.5. Thanh toán VNPay Sandbox

#### FR-09 — Thanh toán đơn qua VNPay Sandbox

- **Ưu tiên:** Must.
- **Mô tả:** Khách hàng thanh toán đơn của mình qua **VNPay Sandbox**. BrewLite tạo yêu cầu thanh toán cho số tiền chính thức của đơn, tiếp nhận kết quả và quản lý trạng thái thanh toán riêng với trạng thái xử lý đơn.
- **Tiêu chí chấp nhận:** (1) Chỉ chủ đơn đã đăng nhập mới được khởi tạo thanh toán khi đơn ở trạng thái **Chờ thanh toán** và không có giao dịch đang chờ hoặc chưa xác định. (2) Backend tạo URL thanh toán hợp lệ, có mã tham chiếu giao dịch riêng, số tiền khớp với đơn và thời hạn 15 phút; khách hàng được chuyển đến VNPay Sandbox. (3) Khi khách hàng quay về Return URL, giao diện hiển thị trạng thái đang xác minh hoặc trạng thái đã được backend xác nhận; không sử dụng tham số từ trình duyệt làm bằng chứng thanh toán thành công. (4) Backend chỉ ghi nhận **Thành công** sau khi xác minh kết quả hợp lệ từ VNPay, bao gồm chữ ký, mã tham chiếu, số tiền và mã kết quả; đơn được chuyển sang **Đã thanh toán** đúng một lần. (5) Kết quả thất bại được xác minh chuyển giao dịch sang **Thất bại** và được xử lý theo FR-11. (6) Khi chưa có kết quả đáng tin cậy, giao dịch ở trạng thái **Chờ xử lý/Chờ xác minh**; hệ thống không tự kết luận thành công hoặc thất bại. (7) Đơn đã thanh toán hoặc đã hủy không được tạo yêu cầu thanh toán mới. (8) Hệ thống chỉ sử dụng **VNPay Sandbox** và không xử lý giao dịch tiền thật.

#### FR-10 — Chống xử lý trùng thanh toán

- **Ưu tiên:** Must.
- **Mô tả:** Hệ thống kiểm soát yêu cầu khởi tạo thanh toán gửi lặp và IPN VNPay được gửi nhiều lần, bảo đảm không ghi nhận hai kết quả hoặc tạo hai lần thanh toán cho cùng yêu cầu.
- **Tiêu chí chấp nhận:** (1) Mỗi yêu cầu khởi tạo có `idempotency key` hoặc mã tham chiếu duy nhất được backend quản lý. (2) Cùng key và cùng nội dung trả về cùng lần xử lý đã ghi nhận, không tạo lần xử lý mới. (3) Cùng key nhưng khác đơn/số tiền/nội dung bị từ chối. (4) Nhiều yêu cầu đồng thời chỉ tạo một lần xử lý hợp lệ. (5) IPN lặp được xác minh và phản hồi theo giao thức VNPay nhưng không cập nhật đơn, giao dịch hay tồn kho lần thứ hai. (6) Không tạo thanh toán mới chỉ vì trình duyệt tải lại Return URL.

#### FR-11 — Hết hạn, thất bại, thanh toán lại và hoàn tồn

- **Ưu tiên:** Must.
- **Mô tả:** Hệ thống xử lý yêu cầu thanh toán hết hạn, giao dịch thất bại, giao dịch chưa xác định và việc thanh toán lại; tồn kho chỉ được hoàn hoặc cập nhật một lần theo kết quả đã được xác minh.
- **Tiêu chí chấp nhận:** (1) Mỗi yêu cầu thanh toán có thời hạn 15 phút kể từ thời điểm được tạo. (2) Khi yêu cầu hết hạn, backend kiểm tra kết quả giao dịch trước khi thay đổi trạng thái đơn hoặc tồn kho. (3) Nếu giao dịch đã được xác minh là thất bại hoặc hết hạn, hệ thống hoàn tồn kho đúng một lần; đơn vẫn ở trạng thái **Chờ thanh toán** và có thể được thanh toán lại. (4) Trước khi thanh toán lại, backend tính lại tổng tiền và kiểm tra tồn kho. Nếu dữ liệu hợp lệ, hệ thống giữ tồn kho và tạo yêu cầu thanh toán mới với mã giao dịch và thời hạn mới. (5) Nếu giao dịch trước đang chờ hoặc chưa xác định, hệ thống không hoàn tồn kho và không cho phép tạo yêu cầu thanh toán mới cho đến khi hoàn tất xác minh. (6) Nếu kết quả thành công hợp lệ đến muộn và đơn vẫn đủ điều kiện cập nhật, hệ thống chuyển đơn sang **Đã thanh toán** đúng một lần. (7) Nếu đơn hoặc tồn kho không còn đủ điều kiện cập nhật an toàn, hệ thống ghi nhận giao dịch để đối soát thủ công, không âm thầm ghi đè dữ liệu. (8) Đơn đã thanh toán không được thanh toán lại. (9) MVP không hỗ trợ hoàn tiền.

### 1.6. Lịch sử và xử lý đơn

#### FR-12 — Xem xác nhận và chi tiết đơn

- **Ưu tiên:** Must.
- **Mô tả:** Khách hàng xem mã đơn, snapshot sản phẩm, tổng tiền, hạn thanh toán và trạng thái đơn/thanh toán thuộc tài khoản mình.
- **Tiêu chí chấp nhận:** (1) Chi tiết hiển thị dữ liệu tại thời điểm đặt. (2) Trạng thái đơn và thanh toán được phân biệt. (3) Không trả dữ liệu đơn của người khác hoặc đơn không tồn tại.

#### FR-13 — Xem lịch sử đơn hàng

- **Ưu tiên:** Must.
- **Mô tả:** Khách hàng xem các đơn đã đặt và mở chi tiết từng đơn.
- **Tiêu chí chấp nhận:** (1) Chỉ liệt kê đơn của người đang đăng nhập. (2) Mỗi dòng có mã, thời điểm, tổng tiền, trạng thái. (3) Có trạng thái danh sách trống. (4) Tải lại nhận trạng thái mới nhất.

#### FR-14 — Xem đơn của cửa hàng

- **Ưu tiên:** Must.
- **Mô tả:** Nhân viên quầy và Quản lý cửa hàng xem danh sách/chi tiết đơn để tiếp nhận và xử lý.
- **Tiêu chí chấp nhận:** (1) Chỉ hai vai trò được phép truy cập. (2) Hiển thị mã đơn, thời gian, sản phẩm, số lượng, tổng tiền và trạng thái. (3) Khách hàng không xem được danh sách quản lý đơn.

#### FR-15 — Cập nhật trạng thái xử lý đơn

- **Ưu tiên:** Must.
- **Mô tả:** Nhân viên quầy và Quản lý cửa hàng xử lý đơn đã thanh toán theo thứ tự **Đã thanh toán → Đang chuẩn bị → Sẵn sàng nhận → Hoàn tất**.
- **Tiêu chí chấp nhận:** (1) Chỉ cho phép chuyển sang bước kế tiếp. (2) Không bỏ bước, quay lui, sửa đơn đã hủy/hoàn tất. (3) Không cho phép nhân viên tự xác nhận thanh toán thành công. (4) Trạng thái mới được lưu và hiển thị cho các bên có quyền. (5) Không có chức năng khách tự hủy đơn đã thanh toán hoặc yêu cầu hoàn tiền.

## 2. Yêu cầu phi chức năng

### 2.1. Hiệu năng

#### NFR-01 — Thời gian phản hồi

- **Ưu tiên:** Should.
- **Mô tả:** Các thao tác chính có thời gian phản hồi phù hợp quy mô MVP; thời gian người dùng thao tác tại VNPay không tính là thời gian xử lý API BrewLite.
- **Tiêu chí chấp nhận:** (1) Với 20 người dùng đồng thời, ít nhất 95% yêu cầu menu/chi tiết sản phẩm phản hồi trong 2 giây. (2) Ít nhất 95% yêu cầu tạo đơn, tạo URL VNPay và cập nhật trạng thái nội bộ phản hồi trong 3 giây, không tính độ trễ bên ngoài. (3) Lỗi server không quá 1% trong bài kiểm tra trên test/staging. (4) Lưu kết quả kiểm thử.

### 2.2. Bảo mật

#### NFR-02 — Bảo vệ tài khoản và JWT

- **Ưu tiên:** Must.
- **Mô tả:** Bảo vệ thông tin đăng nhập và phiên xác thực.
- **Tiêu chí chấp nhận:** (1) Mật khẩu được băm an toàn. (2) Mật khẩu và JWT không bị ghi log. (3) API bảo vệ trả `401` cho JWT thiếu/sai/hết hạn. (4) JWT secret và thời hạn cấu hình ngoài mã nguồn.

#### NFR-03 — Kiểm soát truy cập và dữ liệu đầu vào

- **Ưu tiên:** Must.
- **Mô tả:** Backend kiểm tra quyền và dữ liệu trước khi thực hiện nghiệp vụ.
- **Tiêu chí chấp nhận:** (1) Người dùng thiếu quyền nhận `403`. (2) Không truy cập được đơn của tài khoản khác. (3) Dữ liệu thiếu/sai kiểu/ngoài phạm vi bị từ chối. (4) Kiểm soát có hiệu lực khi gọi API trực tiếp. (5) Lỗi production không lộ stack trace hoặc secret.

#### NFR-04 — Bảo vệ tích hợp VNPay Sandbox

- **Ưu tiên:** Must.
- **Mô tả:** Tích hợp VNPay qua cấu hình bảo mật, xác minh thông báo từ cổng và không lưu dữ liệu thẻ nhạy cảm.
- **Tiêu chí chấp nhận:** (1) VNPay TMN Code, Hash Secret, URL môi trường và các secret được cấu hình ngoài mã nguồn; không commit hoặc ghi log secret. (2) Backend xác minh chữ ký IPN theo tài liệu VNPay trước khi xử lý. (3) Đối chiếu mã giao dịch, số tiền, trạng thái và giao dịch đã ghi nhận; từ chối thông báo sai hoặc không khớp. (4) Return URL không trực tiếp quyết định trạng thái đã thanh toán. (5) Không thu thập/lưu số thẻ, CVV hoặc thông tin đăng nhập ngân hàng. (6) Kết nối công khai sử dụng HTTPS; endpoint IPN có thể được VNPay Sandbox truy cập trong môi trường triển khai của BrewLite.

### 2.3. Tính khả dụng

#### NFR-05 — Mobile-first và PWA

- **Ưu tiên:** Must.
- **Mô tả:** Giao diện responsive, ưu tiên di động và có các thành phần PWA cơ bản.
- **Tiêu chí chấp nhận:** (1) Hoạt động từ viewport 360 px không cuộn ngang ngoài ý muốn. (2) Các thao tác chính dùng được trên mobile/desktop. (3) Có Web App Manifest hợp lệ. (4) Trình duyệt hỗ trợ có thể cài PWA. (5) Kiểm thử luồng chính trên mobile và desktop.

#### NFR-06 — Phản hồi trạng thái giao diện

- **Ưu tiên:** Should.
- **Mô tả:** Hiển thị loading, empty, error và kết quả thao tác rõ ràng, đặc biệt khi thanh toán chưa xác định.
- **Tiêu chí chấp nhận:** (1) Màn hình tải dữ liệu có trạng thái phù hợp. (2) Form chỉ rõ lỗi đầu vào. (3) Hạn chế gửi lặp. (4) Sau đặt đơn/chuyển hướng VNPay/quay về, hiển thị thành công, thất bại hoặc đang xác minh theo trạng thái backend. (5) Không hiển thị thông tin kỹ thuật nhạy cảm.

### 2.4. Khả năng triển khai

#### NFR-07 — Tái tạo môi trường

- **Ưu tiên:** Must.
- **Mô tả:** Có thể khởi chạy frontend, backend và PostgreSQL từ cấu hình dự án.
- **Tiêu chí chấp nhận:** (1) Docker Compose khởi chạy web/API/database. (2) Có cấu hình môi trường mẫu không chứa secret. (3) Migration tạo cấu trúc dữ liệu mới. (4) Seed cung cấp dữ liệu mẫu. (5) API có health check. (6) Database production không public trực tiếp.

#### NFR-08 — CI/CD và triển khai

- **Ưu tiên:** Must.
- **Mô tả:** Quy trình CI/CD kiểm tra mã nguồn và hỗ trợ triển khai có thể truy vết/rollback.
- **Tiêu chí chấp nhận:** (1) Pull Request chạy install, lint, unit test, build. (2) Quality gate thất bại thì không merge/triển khai. (3) Artifact/image có tag phiên bản hoặc commit SHA. (4) Migration và secret được xử lý an toàn. (5) Có smoke test sau triển khai. (6) README hướng dẫn chạy, test, deploy và rollback.

### 2.5. Tính sẵn sàng và phục hồi

#### NFR-09 — Phục hồi và nhất quán dữ liệu

- **Ưu tiên:** Must.
- **Mô tả:** Phục hồi sau gián đoạn mà không gây sai lệch đơn, thanh toán hoặc tồn kho.
- **Tiêu chí chấp nhận:** (1) Health check kiểm tra API/database. (2) Dịch vụ production tự khởi động lại khi lỗi. (3) Trong bài kiểm tra, dịch vụ trở lại healthy tối đa 5 phút sau khởi động lại. (4) Transaction nội bộ commit toàn bộ hoặc rollback. (5) Xử lý lại yêu cầu/IPN vẫn tuân thủ idempotency. (6) Giao dịch chưa rõ kết quả được giữ để xác minh/đối soát, không tự đánh dấu thất bại. (7) Có hướng dẫn rollback triển khai.

## 3. Danh sách Use Case tổng quát

### 3.1. Actor và ranh giới

Ranh giới sơ đồ: **HỆ THỐNG BREWLITE**.

| Mã actor | Tên actor | Vai trò |
|---|---|---|
| ACT-01 | Khách hàng | Xem menu, giỏ hàng, tài khoản, đặt và thanh toán đơn, xem đơn của mình. |
| ACT-02 | Nhân viên quầy | Đăng nhập, đăng xuất, xem đơn cửa hàng và cập nhật trạng thái xử lý. |
| ACT-03 | Quản lý cửa hàng | Đăng nhập, đăng xuất, xem đơn cửa hàng và cập nhật trạng thái xử lý. |
| ACT-04 | VNPay Sandbox | Payment Service mô phỏng bên ngoài BrewLite, tương tác với UC-08 và không xử lý tiền thật. |

### 3.2. Các Use Case

| Mã | Use Case | Actor chính | Actor hỗ trợ | Yêu cầu liên quan |
|---|---|---|---|---|
| UC-01 | Xem menu | Khách hàng | — | FR-01 |
| UC-02 | Xem chi tiết sản phẩm | Khách hàng | — | FR-02 |
| UC-03 | Quản lý giỏ hàng | Khách hàng | — | FR-03 |
| UC-04 | Đăng ký tài khoản | Khách hàng | — | FR-04 |
| UC-05 | Đăng nhập | Khách hàng, Nhân viên quầy, Quản lý cửa hàng | — | FR-05, FR-06 |
| UC-06 | Đăng xuất | Khách hàng, Nhân viên quầy, Quản lý cửa hàng | — | FR-05 |
| UC-07 | Đặt đơn | Khách hàng | — | FR-06, FR-07, FR-08 |
| UC-08 | Thanh toán đơn | Khách hàng | VNPay Sandbox | FR-06, FR-09, FR-10, FR-11 |
| UC-09 | Xem xác nhận và chi tiết đơn | Khách hàng | — | FR-06, FR-12 |
| UC-10 | Xem lịch sử đơn | Khách hàng | — | FR-06, FR-13 |
| UC-11 | Xem đơn của cửa hàng | Nhân viên quầy, Quản lý cửa hàng | — | FR-06, FR-14 |
| UC-12 | Cập nhật trạng thái đơn | Nhân viên quầy, Quản lý cửa hàng | — | FR-06, FR-15 |

### 3.3. Mô tả sơ đồ tổng quát

Sơ đồ gồm **12 Use Case** bên trong ranh giới BrewLite và **4 actor** bên ngoài. Khách hàng liên kết UC-01 đến UC-10; Nhân viên quầy và Quản lý cửa hàng liên kết UC-05, UC-06, UC-11, UC-12; VNPay Sandbox liên kết UC-08. Các bước xác minh IPN, xử lý Return URL, tính lại giá, kiểm tra tồn và chống xử lý trùng là xử lý bên trong các Use Case tương ứng, không tách thành Use Case mới trên sơ đồ tổng quát.

- Nguồn sơ đồ: `docs/diagrams/sources/use-case-overview.drawio`.
- Bản xuất sơ đồ: `docs/diagrams/exports/use-case-overview.svg`.

## 4. Đối chiếu yêu cầu và phạm vi

### 4.1. Truy vết yêu cầu chức năng

| Yêu cầu | Use Case | Hình thức kiểm chứng |
|---|---|---|
| FR-01 | UC-01 | API/UI test menu, trạng thái còn hàng, loading/empty/error. |
| FR-02 | UC-02 | Test chi tiết, size/topping, số lượng, giá tạm tính. |
| FR-03 | UC-03 | Component test thêm/sửa/xóa/tổng tiền giỏ. |
| FR-04 | UC-04 | Integration test đăng ký, email trùng, dữ liệu sai. |
| FR-05 | UC-05, UC-06 | Test đăng nhập, JWT, đăng xuất. |
| FR-06 | UC-05, UC-07 đến UC-12 | Authorization test vai trò/quyền sở hữu. |
| FR-07 | UC-07 | Integration test tạo đơn, snapshot, tính lại giá. |
| FR-08 | UC-07 | Test tồn kho, đặt đồng thời, rollback. |
| FR-09 | UC-08 | Sandbox integration/E2E: tạo URL, redirect, return, IPN hợp lệ/sai. |
| FR-10 | UC-08 | Test idempotency, key xung đột, IPN trùng/đồng thời. |
| FR-11 | UC-08 | Test hết hạn, thất bại, thanh toán lại, chờ xác minh, đối soát và hoàn tồn một lần. |
| FR-12 | UC-09 | API/UI test chi tiết và quyền sở hữu đơn. |
| FR-13 | UC-10 | API/UI test lịch sử và trạng thái trống. |
| FR-14 | UC-11 | Authorization/UI test danh sách đơn cửa hàng. |
| FR-15 | UC-12 | Test chuyển trạng thái hợp lệ, sai thứ tự và sai quyền. |

### 4.2. Truy vết yêu cầu phi chức năng

| Yêu cầu | Phạm vi kiểm chứng | Hình thức kiểm chứng |
|---|---|---|
| NFR-01 | UC-01, UC-02, UC-07, UC-08, UC-11, UC-12 | Load test API nội bộ và tỷ lệ lỗi. |
| NFR-02 | UC-04 đến UC-12 | Security test mật khẩu/JWT. |
| NFR-03 | UC-04 đến UC-12 | API validation/authorization test. |
| NFR-04 | UC-08 và môi trường tích hợp | Kiểm tra secret, chữ ký IPN, đối chiếu giao dịch và HTTPS. |
| NFR-05 | Giao diện UC-01 đến UC-12 | Responsive/PWA test. |
| NFR-06 | Giao diện UC-01 đến UC-12 | Component/E2E test trạng thái và lỗi. |
| NFR-07 | Toàn hệ thống | Docker Compose, migration, seed, health check. |
| NFR-08 | Quy trình triển khai | CI/CD, smoke test, rollback. |
| NFR-09 | UC-07, UC-08, UC-11, UC-12 | Recovery, transaction, IPN trùng, đối soát. |

### 4.3. Ranh giới MVP

- **Trong phạm vi:** Một cửa hàng; xem menu, chi tiết sản phẩm, giỏ hàng, tài khoản, đặt đơn, thanh toán qua **VNPay Sandbox**, xem lịch sử và xử lý trạng thái đơn; nhận đồ uống tại quầy.
- **Tồn kho:** Quản lý theo Product; size và topping là tùy chọn giá, không có tồn riêng.
- **Thanh toán:** Không thu tiền thật; chỉ ghi nhận thành công khi backend đã xác minh kết quả hợp lệ. Đơn chưa rõ kết quả được giữ để xác minh/đối soát trước khi hủy và hoàn tồn.
- **Ngoài phạm vi:** Giao hàng, nhiều chi nhánh, thanh toán production/tiền thật, lưu dữ liệu thẻ, hoàn tiền, khách tự hủy đơn đã thanh toán, khuyến mãi, tích điểm và thống kê nâng cao.
