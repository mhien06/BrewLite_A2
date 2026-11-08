# ADR-001: Dùng monorepo (pnpm workspaces) cho web, API và mã dùng chung

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-08
- **Liên quan:** NFR-07, NFR-08; ràng buộc "Quy trình" trong `context-and-scope.md` §8

## Bối cảnh
BrewLite có hai ứng dụng (Next.js và NestJS) do cùng một nhóm làm, cùng phát hành và cùng chạy qua Docker Compose. Hợp đồng dữ liệu (DTO, enum như `OrderStatus`, `PaymentStatus`) phải khớp giữa frontend và backend (rủi ro RR-02). Yêu cầu truy vết yêu cầu → thiết kế → code → test thuận lợi hơn khi mọi thứ ở một repository.

## Quyết định
Một repository, quản lý bằng **pnpm workspaces**:

```
apps/web        # Next.js (PWA)
apps/api        # NestJS
packages/shared # enum, kiểu dữ liệu, hằng số dùng chung (OrderStatus, PaymentStatus, UserRole)
docs/           # tài liệu, sơ đồ, ADR
docker-compose.yml
```

CI dùng path filter để chỉ chạy job của phần bị thay đổi.

## Phương án đã cân nhắc
- **Nhiều repository (polyrepo):** tách bạch, nhưng phải đồng bộ phiên bản hợp đồng API giữa hai repo và tốn công cho nhóm nhỏ.
- **Monorepo kèm Nx/Turborepo:** cache build tốt, nhưng thêm công cụ và cấu hình không cần thiết ở quy mô MVP.

## Hệ quả
- **Ưu điểm:** một PR có thể sửa API, UI và tài liệu cùng lúc; kiểu dùng chung giảm lệch hợp đồng; một lệnh `docker compose up` khởi chạy toàn bộ.
- **Hạn chế:** pipeline CI phải cấu hình path filter; lịch sử commit chung nhiều phần; cần quy ước thư mục rõ để tránh phụ thuộc chéo `web` ↔ `api` (chỉ được dùng qua `packages/shared`).
