# Sunbot System Hub

Cổng tra cứu trung tâm cho các ứng dụng, website, công cụ và tài nguyên số của hệ sinh thái Sunbot trên tài khoản GitHub `sunbotvietnam`.

## Mục tiêu

- Tìm nhanh mọi sản phẩm từ một địa chỉ.
- Phân loại theo vai trò vận hành thay vì chỉ theo tên repository.
- Hiển thị trạng thái và thời điểm cập nhật đáng chú ý.
- Giữ nguyên các phiên bản hiện có, đồng thời đánh dấu cụm nghi trùng để rà soát.
- Hoạt động tốt trên điện thoại, máy tính và màn hình TV mà không cần build process.

## Cấu trúc

Toàn bộ giao diện và dữ liệu danh mục nằm trong `index.html`. Đây là static app không có dependency runtime, tương thích GitHub Pages.

## Quy ước trạng thái

- **Đang hoạt động**: điểm truy cập rõ chức năng và đang có thể sử dụng.
- **Cần xác nhận**: chức năng có vẻ hữu ích nhưng cần xác định vai trò/bản chính.
- **Rà soát trùng**: có nội dung hoặc chức năng gần với một sản phẩm khác.
- **Tiện ích**: công cụ/tài nguyên hỗ trợ, không phải hệ thống vận hành chính.
- **Repo trống**: chưa có nội dung để sử dụng.

## Cập nhật danh mục

Thêm/sửa một object trong mảng `items` ở cuối `index.html`. Không xoá repository chỉ dựa trên nhãn trong Hub; cần rà soát dữ liệu, người dùng và link đang được chia sẻ trước khi archive hoặc redirect.
