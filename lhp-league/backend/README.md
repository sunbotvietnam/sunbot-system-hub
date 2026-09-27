# LHP League preorder backend

Backend dùng Google Apps Script và Google Sheet:
https://docs.google.com/spreadsheets/d/1Zdkx5uSRLyo90UGNu4_JTB4F8TvuGzq6gvnys97Vx-8/edit

## Deploy
1. Mở script.google.com, tạo project mới.
2. Dán nội dung Code.gs.
3. Deploy > New deployment > Web app.
4. Execute as: Me.
5. Who has access: Anyone.
6. Copy URL dạng https://script.google.com/macros/s/.../exec.
7. Gắn URL đó vào hằng LHP_API_URL trong lhp-league/index.html.

Khi deploy xong:
- form ghi vào ORDERS;
- đơn mới giữ hàng ngay;
- tồn hiển thị = quota - reserved - paid;
- đơn PENDING hết 24h sẽ tự EXPIRED và trả lại tồn;
- trang nhận thông báo thành công từ iframe và refresh tồn ngay.
