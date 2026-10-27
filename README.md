# 🌾 Làng Mây Phong Nam — Bản Đầy Đủ (Năm Hồi)

> *“Năm hồi cốt truyện từ nông trại hoang tới Sài Gòn Mây, Cõi Âm Đô và ba kết cục. Phong Nam đang hồi sinh.”*

**Làng Mây Phong Nam** là tựa game mô phỏng nông trại phiêu lưu mang phong cách Pixel Art thuần HTML5 Canvas & JavaScript, lấy cảm hứng từ nét đẹp văn hóa làng quê Việt Nam và miền sông nước Nam Bộ. Game tích hợp sẵn chế độ chơi mạng Co-op nhiều người (P2P qua PeerJS/WebRTC) trực tiếp trên trình duyệt mà không cần cài đặt server hay công cụ phức tạp.

---

## ✨ Điểm nổi bật & Tính năng chính

- 🌾 **Nông nghiệp & Sản vật thuần Việt**: Trồng trọt lúa nước, lúa nếp, ngô, cà phê, thốt nốt, sầu riêng, bưởi, thanh long, tơ tằm, sâm,... cùng chu kỳ thời tiết và bốn mùa.
- ⚒️ **Chế tác & Rèn luyện**: Nâng cấp nông cụ ngũ hành từ Đồng, Bạc, Vàng đến Long Mạch tại lò rèn Bác Ba.
- 👥 **Dân làng & Hội thoại phong phú**: Gặp gỡ và kết thân cùng các NPC thân thương: Cụ Bát (Trưởng làng), Chú Sáu thợ mộc, Cô Ba Thẩm thợ nhuộm vải, Bác Tài Bảy xe buýt, Bà Cụ Hạt trà đá vỉa hè, Bác Sĩ Lan trạm xá, Cu Cội linh hồn cây đa,...
- 🗺️ **Hành trình khám phá 5 hồi**: Du hành từ nông trại hoang, chợ làng quê, xe buýt qua hầm Bến Xe Miền Tây, Sài Gòn Mây cho tới Cõi Âm Đô huyền bí với 3 cái kết khác nhau.
- 🎮 **Chơi nhiều người (Co-op P2P 5 người)**:
  - 1 Host + tối đa 4 Guest kết nối trực tiếp qua mã phòng PeerJS (WebRTC DataChannel).
  - Khách vào chơi có khoảnh đất và căn nhà riêng biệt, tự do canh tác và lưu lại nông trại trên máy Host.
- ⚡ **Zero Setup & Lightweight**: Chạy trực tiếp chỉ bằng cách mở tệp HTML trên mọi trình duyệt web (Chrome, Edge, Firefox, Safari) trên cả máy tính lẫn di động.

---

## 📁 Cấu trúc mã nguồn

- [lang-may-phong-nam-ban-day-du.html](file:///c:/Users/Admin/Documents/LangMayPhongNam/lang-may-phong-nam-ban-day-du.html): Toàn bộ engine đồ họa canvas, logic game, âm thanh, hệ thống NPC, bản đồ và cốt truyện.
- [coop-module.js](file:///c:/Users/Admin/Documents/LangMayPhongNam/coop-module.js): Module mạng P2P PeerJS điều phối kết nối phòng chơi đa người chơi.
- [.gitignore](file:///c:/Users/Admin/Documents/LangMayPhongNam/.gitignore): Tệp loại trừ file tạm hệ thống cho Git.

---

## 🚀 Hướng dẫn chơi & Trải nghiệm

1. Tải hoặc sao chép mã nguồn về máy.
2. Mở trực tiếp file `lang-may-phong-nam-ban-day-du.html` bằng trình duyệt web bất kỳ.
3. Tạo nhân vật (chọn kiểu tóc, nón lá, trang phục) và bắt đầu hành trình hồi sinh Làng Phong Nam!

---

## 👥 Hướng dẫn cộng tác & Đóng góp qua Git

### Khởi tạo và đẩy lên GitHub:
```bash
git init
git branch -M main
git add .
git commit -m "feat: Khởi tạo dự án Làng Mây Phong Nam"
git remote add origin https://github.com/<tai-khoan>/<ten-repo>.git
git push -u origin main
```

### Quy trình làm việc nhóm (Branching & Pull Request):
1. **Clone dự án**: `git clone <url-repo>`
2. **Tạo nhánh tính năng**: `git checkout -b feature/ten-tinh-nang`
3. **Commit & Push**: `git commit -m "feat: mô tả thay đổi"` và `git push origin feature/ten-tinh-nang`
4. **Tạo Pull Request** trên GitHub để cùng review và thảo luận trước khi hợp nhất vào `main`.
