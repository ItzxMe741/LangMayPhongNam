# Làng Mây Phong Nam — cập nhật V6

Mở `lang-may-phong-nam-ban-day-du.html` để chơi một mình. Mã V6 được nhúng sẵn, không cần cài thư viện. Bản trước khi chỉnh nằm trong `dev/backups/v5`.

## Chơi LAN

1. Trên máy chủ, bấm đúp `Choi-LAN.cmd`, hoặc mở PowerShell trong thư mục này và chạy `node dev/server/lan-server.cjs`.
2. Mở địa chỉ HTTP được in ra, ví dụ `http://192.168.x.x:8787`. Bạn bè cùng mạng mở chính địa chỉ đó.
3. Tạo hoặc chơi tiếp một nhân vật. Mở Co-op, tạo phòng LAN, đặt mật khẩu nếu muốn. Khách làm mới danh sách và chọn phòng.
4. Host có thể mời khách rời phòng và bật/tắt quyền kho chung. Giữ cửa sổ server chạy trong lúc chơi. Đóng phòng trong game khi kết thúc.

Danh sách phòng gồm các phòng trên cùng máy chủ LAN; trình duyệt không tự quét tất cả thiết bị trong Wi-Fi. Không cần dịch vụ PeerJS khi dùng LAN. Kết nối PeerJS cũ vẫn có trong mục tùy chọn. Tối đa 6 người theo cấu hình game hiện tại. Không sửa tường lửa tự động.

## Đi lại

- Nông trại → Đông: Làng Nông Lâm.
- Làng → Bắc: Rừng Trúc (60 × 88, gấp đôi bản cũ) → Bắc: Suối Rừng Cổ Thụ.
- Làng → Đông: Phố Cổ Hội An → góc Tây Bắc: Hang Phong Nha. Cần đuốc hoặc đèn pin trong túi.
- Hang → lối Nam bên phải: Bãi Biển Thuần Việt. Lối Nam bên trái quay về Hội An.
- Nông trại → Nam: Bến Rạch → Nam: đất đỏ Tây Nguyên.
- Nông trại → Tây: trạm xe buýt. Vé cơ bản 50 tiền game, có hoạt cảnh xe; tàu nhanh vẫn theo nhiệm vụ cũ.

Mở Sổ kiến trúc trên thanh biểu tượng để mua đuốc (30 tiền game).

## Biển, suối và cây cối

Biển có dừa, ghe thúng, chòi nghỉ, cầu tàu, sóng và vật phẩm mỗi ngày. Cua đá phải đập/nâng đá bằng cuốc chim. Cá biển hiếm chỉ cắn khi đứng trên cầu tàu; Cá Mú Cổ Đại chỉ ở đầu cầu, mùa Thu, đêm mưa. Khung giờ đêm là 18:00–02:00. Cá thu/ngừ: Xuân/Hạ, 06:00–18:00; tôm hùm/cá chim: Thu/Đông, buổi đêm.

Cá lăng/cá bỗng ở thượng nguồn suối. Cần câu trúc hoặc mồi côn trùng tăng 35% trọng số cá suối hiếm; hai hiệu ứng không cộng dồn. Mồi được dùng mỗi lần quăng câu. Chế tạo trong Sổ kiến trúc.

Cây bàng tự nhiên, gỗ lim/nghiến, trúc, cây ven ao và nấm sau mưa bổ sung tài nguyên. Cây giống Dừa/Chuối/Xoài/Mít/Vú Sữa mua trong Sổ hoặc qua tạp hóa. Chọn Trồng rồi bấm ô đất trống gần nhân vật. Cây sống nhiều mùa và thu nhiều đợt; xoài Hạ, mít Thu, vú sữa Thu/Đông, dừa/chuối quanh năm. Chặt cây trưởng thành cho gỗ riêng, kèm trái nếu đang chín.

## Xây dựng và chế tạo

Bấm 🏗 trên HUD. Chọn công trình, lớp 0–2 rồi bấm ô cạnh nhân vật. Chọn Gỡ để thu hồi vật liệu; Esc thoát chế độ xây. Công trình và cây trồng không được đè vật thể, người chơi, ruộng có sẵn hoặc chặn lối. Cầu gỗ đặt được trên ao nông trại. Giếng/lu múc nước; chòi/chõng hồi sức; xưởng mở sổ chế tạo. Bản vẽ chõng tre nhận qua nhiệm vụ dọn cây bàng.

Xây dựng dùng các khối pixel xếp 3 lớp trong engine 2D hiện tại. Công trình cốt truyện, ao gốc và đường chính giữ vị trí; việc quy hoạch tập trung vào các ô đất trống và cầu trên nước, chưa hỗ trợ di dời toàn bộ công trình gốc hay đào/san lại địa hình. Đây chưa phải engine voxel 3D.

Rìu mặc định ở ô số 9 trên thanh công cụ. Có thể kéo một ô sang ô khác để đổi chỗ hai dụng cụ; phím 1–9 đi theo thứ tự mới. Thứ tự tự lưu trên máy. Trong Sổ kiến trúc có nút Khôi phục thứ tự ô. Rìu, dùng 3–5 nhịp để đốn cây; cuốc chim đập đá 4 nhịp, tiêu hao sức mỗi nhịp. Trúc phục hồi sau 3 ngày. Có thể xới, gieo, tưới và thu hoạch cà phê/cây mùa vụ trên đất Tây Nguyên. Cây giống lâu năm không cần ô xới.

Sổ có công thức xẻ gỗ, nung gạch/ngói, làm gốm, dệt mái lá, cần câu và món ăn. Bốn nhiệm vụ phụ có tiến độ và nhận thưởng riêng, không thêm điều kiện cho mạch truyện chính. Nội thất nhà NPC có điểm thắp hương, uống trà/nghỉ; NPC dừng trú nắng gần cây và tặng vật liệu khi vườn đủ phong phú. Chim và cây ven nước là hoạt cảnh trang trí; chưa có mô phỏng AI riêng cho từng loài chim/sóc.

## Lưu và đồng bộ

Tiến độ V6 nằm trong bản lưu hiện có, không xóa bản lưu cũ. Trong co-op, Host giữ cây, công trình, ruộng Tây Nguyên, nhiệm vụ phụ và kho chung; khách gửi yêu cầu thay đổi, nhận lại kết quả. Khi rời phòng, bản vườn/nhiệm vụ/kho cá nhân của khách được trả lại. Các thao tác gửi chưa được xác nhận được hoàn nguyên chi phí khi rời phòng.

## Kiểm tra và phát triển

- `node dev/tools/build-v6.cjs`: nhúng `dev/src/v6-world.js` và `dev/src/v6-lan.js` vào HTML.
- `node dev/tests/test-v6.cjs`: cú pháp, khởi động, đường nối vùng, điều kiện câu cá, mùa quả, đặt/gỡ/hoàn vật liệu, canh tác Tây Nguyên, kho và khôi phục dữ liệu riêng.
- Khi server đang chạy: `node dev/tests/test-lan.cjs` kiểm tra tạo phòng, mật khẩu, relay, quyền Host, kick và chặn Origin ngoài.
- `node dev/tools/make-v6-preview.cjs`: tạo bản thử riêng ở `dev/output/playwright/v6-preview.html`; đường `/__test` chỉ được server cung cấp cho localhost. Bản game chính không chứa nút thử hay tài nguyên mẫu.

Đã thử giao diện thật và luồng hai tab Host/Guest trên localhost. Chưa thử hai thiết bị vật lý qua Wi-Fi hoặc đo hiệu năng trên điện thoại. Các hiệu ứng nước là hoạt ảnh canvas pixel; không dùng shader GPU chuyên dụng.
