# Sunbot Billing API

Backend Google Apps Script cho `billing/`.

## Nguồn dữ liệu

Spreadsheet: `SUNBOT_OPS_DATABASE` (`1xgXFFHKZxWQFRyExeMqcDYFGUxYzxooSBLu0xUvTi3w`)

Các sheet:

- `BILLING_CONFIG`: cấu hình trường và đơn giá mặc định.
- `BILLING_POLICY`: quy tắc ngoại lệ lặp lại theo trường. Nếu chưa có rule riêng, API sinh 3 rule chuẩn từ `BILLING_CONFIG`.
- `BILLING_CASES`: hồ sơ thanh toán theo trường/tháng/phiên bản.
- `BILLING_LINES`: chi tiết khối lượng và điều chỉnh.

## Bảo vệ truy cập

API không dùng Google Sheet công khai. Mỗi request phải có `token` của phiên Sunbot System Hub. Backend gọi access backend hiện tại để xác minh tài khoản có quyền `billing` trước khi đọc/ghi dữ liệu.

## Deploy

1. Tạo Apps Script project thuộc tài khoản Kiro/Sunbot.
2. Dán `Code.gs`.
3. Deploy dưới dạng Web app, Execute as chủ sở hữu, quyền truy cập phù hợp với endpoint nội bộ.
4. Dán URL `/exec` vào `billing/config.js` dưới biến `BILLING_BACKEND_URL`.
5. Frontend cần gửi token `sunbot_access_session_v3.token` trong request.

Không công khai sheet dưới dạng CSV/GViz cho Billing.
