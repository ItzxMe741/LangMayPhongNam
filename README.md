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
- 🏷️ **Hệ thống biểu tượng NPC thông minh**: Trực quan hóa vai trò dân làng với 4 biểu tượng riêng biệt (`!`, `?`, `👜`, `...`).
- ☁️ **Lưu đám mây không lo mất Save**: Đồng bộ qua Tên tài khoản & Mật khẩu trực tiếp lên đám mây Vercel KV / Firebase, không sợ mất dữ liệu khi xóa cache hay duyệt web ẩn danh.

---

## 🏷️ Bảng Hệ Thống Biểu Tượng Trên Đầu NPC

Hệ thống biểu tượng trên đầu NPC trong game được thiết kế trực quan theo phong cách Pixel Art, giúp người chơi dễ dàng nhận diện vai trò, nhiệm vụ và các tương tác đặc biệt:

| Biểu tượng | Màu sắc & Kiểu dáng | Ý nghĩa tương tác | Các NPC áp dụng & Hành vi |
| :---: | :---: | :--- | :--- |
| **`!`** | **Bong bóng Vàng Kim (`#ffd860`)**<br>Dấu chấm than nâu sẫm (`#3b230f`) | **Khoe đồ nhận thưởng / Đổi vật phẩm lấy thưởng / Cho quà miễn phí**<br>*(Hiển thị cố định và không bao giờ mất)* | • **Chú Tám** (`tam`): Khoe cá hiếm câu được để bán gấp đôi giá chợ (`x2`).<br>• **Khách Phương Xa** (`khach`): Đơn hàng thuyền buôn mỗi ngày (trả thưởng `x2.5`).<br>• **Hùng Thợ Rèn** (`hung`): Nộp 4 Mảnh Khuôn Đúc Cổ để đúc bộ đồ Thần.<br>• **Anh Tuấn** (`anhtuan`): Định giá & mở kho đồ cũ giá cao hơn 15%.<br>• **Mẹ Mai** (`mebamai`): Cho đồ ăn / bánh chưng / cơm nắm mỗi ngày.<br>• **Bé Na** (`bena`): Quyên góp tiền xây Trường Học Làng Mây.<br>• **Anh Hoàng** (`anhhoang`): Chế tạo Máy Tự Động Hóa Trang Trại.<br>• **Quốc Bảo** (`quocbao`): Cho phân bón thử nghiệm miễn phí mỗi ngày.<br>• **Thầy Táo** (`thaytao`): Giảng sách nhận +5 Nhân Đức mỗi ngày. |
| **`?`** | **Bong bóng Vàng Kim (`#ffd860`)**<br>Dấu hỏi nâu sẫm (`#3b230f`) | **Có thể nhận nhiệm vụ mới / Cần trò chuyện tiếp bước nhiệm vụ** | • Các NPC đang giữ nhiệm vụ chính hoặc nhiệm vụ phụ cần bạn tiếp nhận/nói chuyện (như **Cụ Bát** ở `q11`, `q12`; **Chú Sáu** ở `q14`, `q15`; **Chú Tư & Cô Ba Thắm** ở `q13`...).<br>• Sau khi hoàn thành nhiệm vụ, dấu `?` sẽ tự động chuyển sang icon Cửa hàng hoặc ẩn. |
| **👜** | **Bong bóng Xanh Ngọc (`#2fa360`)**<br>Túi hàng trắng & khóa vàng | **Cửa hàng / Dịch vụ buôn bán**<br>*(Hiển thị thường trực giúp dễ tìm tiệm)* | • Các NPC bán hạt giống, nông sản, rèn đúc, quán ăn, trà, thuốc men, xe buýt:<br>**Bà Mười** (Tạp hóa & hạt giống), **Cô Ba** (Nước mía), **Chú Tư** (Quán ăn đêm), **Cô Ba Thắm** (Tiệm may), **Bác Sĩ Lan** (Trạm y tế), **Hương** (Tiệm trà), **Linh** (Phân bón), **Chú Bảy** (Cây giống), **Phan Văn Nam** (Cá tươi), **Bác Ba** (Nâng cấp nông cụ)... |
| **`...`** | **Bong bóng Trắng (`#ffffff`)**<br>Ba dấu chấm xám (`#555555`) | **Dân làng còn lại chỉ để trò chuyện tâm tình & tặng quà** | • Các NPC thuần giao lưu, kết bạn, hẹn hò, tăng độ thân thiết:<br>**Bé Tí**, **An** (thổi sáo trúc), **Lương Anh Tuấn** (bác sĩ thú y), **Ông Tư** (mẹo câu cá), **Ông Hai “Nổ”**...<br>• **Chỉ hiện khi chưa nói chuyện hôm nay**; sau khi trò chuyện xong sẽ **tự động ẩn** để màn hình luôn thoáng đãng. |

### Quy tắc phân cấp ưu tiên (Priority Hierarchy)
1. **Ưu tiên 1 (Cao nhất) - Khoe đồ / Đổi vật phẩm nhận thưởng (`!`)**: Luôn hiển thị thường trực, không bị ẩn khi nói chuyện.
2. **Ưu tiên 2 - Tiếp nhận & Trò chuyện nhiệm vụ (`?`)**: Ưu tiên đè lên icon bán hàng để người chơi không bỏ lỡ cốt truyện.
3. **Ưu tiên 3 - Cửa hàng buôn bán (👜)**: Luôn hiển thị thường trực khi không vướng nhiệm vụ.
4. **Ưu tiên 4 - Trò chuyện hàng ngày (`...`)**: Chỉ hiện khi chưa chào hỏi hôm nay (+20 tim, +2 EXP), nói xong tự động biến mất.

---

## ☁️ Hệ Thống Lưu Đám Mây (Cloud Save - Không Sợ Mất Dữ Liệu)

Không cần tải file JSON về máy, bạn có thể lưu trữ tiến trình trực tiếp lên Đám Mây:
- **Đăng ký / Đăng nhập**: Nhập **Tên tài khoản** và **Mật khẩu** bất kỳ tại bảng Lưu Đám Mây (ở màn hình chính hoặc biểu tượng ☁️ góc trên màn hình).
- **Đồng bộ tự động**: Game tự động lưu đồng bộ lên đám mây mỗi khi nhân vật đi ngủ qua ngày mới.
- **Bảo mật & Tiện lợi**: Không sợ mất dữ liệu khi xóa cache trình duyệt, đổi thiết bị, dùng tab ẩn danh hay chơi trên điện thoại / PC khác nhau.
- **Hạ tầng hỗ trợ**: Hỗ trợ Vercel Serverless KV (Upstash Redis) và Firebase Firestore.

---

## 📁 Cấu trúc mã nguồn

- [index.html](file:///c:/Users/Admin/Documents/LangMayPhongNam/index.html): Toàn bộ engine đồ họa canvas, logic game, âm thanh, hệ thống NPC, bản đồ và cốt truyện.
- [coop-module.js](file:///c:/Users/Admin/Documents/LangMayPhongNam/coop-module.js): Module mạng P2P PeerJS điều phối kết nối phòng chơi đa người chơi.
- [.gitignore](file:///c:/Users/Admin/Documents/LangMayPhongNam/.gitignore): Tệp loại trừ file tạm hệ thống cho Git.

---

## 📥 HƯỚNG DẪN KÉO CODE VỀ MÁY TÍNH (CHO MỌI THÀNH VIÊN)

Tùy vào tình huống của bạn, hãy chọn cách kéo code phù hợp bên dưới:

### 1. Kéo bản cập nhật mới nhất về máy (Đã có sẵn thư mục code trên máy)
Mỗi khi có ai đó vừa gộp (merge) tính năng mới trên GitHub, bạn mở PowerShell tại thư mục dự án và chạy:
```bash
# Chuyển sang nhánh chính
git checkout main

# Kéo code mới nhất từ GitHub về máy tính
git pull origin main
```

---

### 2. Tải toàn bộ dự án về máy mới tinh (Lần đầu tham gia dự án)
- **Cách A - Dùng Git (Khuyên dùng)**:
  ```bash
  git clone https://github.com/ItzxMe741/LangMayPhongNam.git
  cd LangMayPhongNam
  ```
- **Cách B - Tải file ZIP (Không cần cài Git)**:
  Bấm vào nút màu xanh **`<> Code`** ở góc trên bên phải trang GitHub > Chọn **Download ZIP** > Giải nén ra là chơi được ngay.

---

### 3. Kéo nhánh tính năng của đồng đội về máy để chạy thử
Nếu đồng đội vừa đẩy lên một nhánh mới (ví dụ: `feature/them-npc`) và bạn muốn kéo về máy để test:
```bash
# Cập nhật danh sách các nhánh từ GitHub
git fetch origin

# Chuyển sang nhánh của đồng đội
git checkout feature/them-npc
```

---

### 4. Dùng chuột trên GitHub Desktop (Không cần gõ lệnh)
- Mở ứng dụng **GitHub Desktop** > Bấm nút **Fetch origin** (hoặc **Pull origin**) ở góc trên bên phải màn hình là code mới tự động kéo về máy!

---

## 💾 Hướng dẫn Sao lưu & Khôi phục dữ liệu game (Chống mất Save)

Để đảm bảo không bao giờ bị mất tiến trình chơi khi dọn dẹp trình duyệt hoặc xóa lịch sử / cache:

- **📥 Tải bản lưu về máy tính (Xuất file .json)**: Khi đang chơi game, bấm vào biểu tượng chiếc đĩa mềm **💾** ở thanh công cụ phía trên bên phải màn hình. Trình duyệt sẽ tải ngay một file `.json` về thư mục **Downloads** trên máy tính bạn.
- **📤 Khôi phục bản lưu (Nạp file .json)**: Ở màn hình Menu chính của game, bấm nút **📂 Nạp file lưu (.json)** và chọn file đã tải trước đó. Game sẽ khôi phục 100% dữ liệu nông trại, túi đồ và cấp độ ngay lập tức.

---

## 🌐 Hướng dẫn chơi Co-op khi khác mạng (Qua GitHub Pages)

- Game hỗ trợ chơi Co-op tối đa **5 người** (1 Host + 4 Guest) xuyên mạng Internet (khác Wi-Fi, 4G/5G) nhờ tích hợp hệ thống máy chủ STUN của Google & Cloudflare.
- **Link chơi trực tuyến**: `https://itzxme741.github.io/LangMayPhongNam/`
- **Cách vào phòng**:
  1. Người làm **Host**: Bấm nút **🤝 Co-op** > chọn **Tạo Phòng** > gửi mã phòng cho bạn bè.
  2. Người làm **Guest**: Bấm nút **🤝 Co-op** > nhập mã phòng > bấm **Vào Phòng**.

---

## 👥 Hướng dẫn quy trình làm việc nhóm (Branching & Pull Request)

1. **Cập nhật code mới nhất**: Luôn chạy `git pull origin main` trước khi làm việc mới.
2. **Tạo nhánh tính năng riêng**: `git checkout -b feature/ten-tinh-nang`
3. **Lưu thay đổi & Đẩy nhánh lên GitHub**:
   ```bash
   git add .
   git commit -m "feat: mô tả thay đổi bạn vừa làm"
   git push origin feature/ten-tinh-nang
   ```
4. **Tạo Pull Request**: Vào trang GitHub, bấm nút **Compare & pull request** để người quản lý dự án kiểm tra và duyệt gộp vào `main`.
