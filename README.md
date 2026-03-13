## Discord Auto Quests — Node.js JavaScript

Công cụ tự động hoàn thành và nhận thưởng Quest trên Discord, viết bằng **JavaScript thuần** chạy trên **Node.js**.

Dựa trên thiết kế từ [Nguoibianhz/Discord-Auto-Quests](https://github.com/Nguoibianhz/Discord-Auto-Quests), được chuyển đổi sang mô hình JS (không cần TypeScript/tsx).

---

### Tính năng

- Auto Watch Video — Tự động xem video quest
- Auto Play on Desktop — Giả lập heartbeat cho quest chơi game trên desktop
- Auto Stream — Hỗ trợ quest dạng stream
- Auto Play Activity — Hỗ trợ quest dạng Activity
- Auto Claim Rewards — Tự động nhận thưởng khi hoàn thành
- Orbs Tracking — Theo dõi số Orbs trước và sau khi hoàn thành
- Live Dashboard — Giao diện CLI real-time hiển thị tiến trình

---

### Yêu cầu hệ thống

- **Node.js** >= 18
- **npm** (đi kèm với Node.js)
- **Discord User Token**

---

### Cài đặt & Sử dụng

**Bước 1: Cài đặt dependencies**

```bash
npm install
```

**Bước 2: Cấu hình Token**

```bash
cp .env.example .env
# Mở file .env và điền Discord token của bạn
```

Nội dung file `.env`:

```
TOKEN=your_discord_user_token_here
```

> **Lưu ý bảo mật**: Không bao giờ chia sẻ token của bạn. Token cho phép truy cập toàn bộ tài khoản Discord.

**Bước 3: Chạy tool**

```bash
npm start
```

---

### Cấu trúc dự án

```
discord-auto-quests/
├── farm.js           # Entry point — UI dashboard & orchestration
├── src/
│   └── engine.js     # Core engine — Discord API, Quest logic
├── .env              # Cấu hình token (không commit lên git!)
├── .env.example      # Mẫu cấu hình
├── package.json      # Dependencies & scripts
└── README.md
```

---

### Lưu ý

- **Bảo mật**: Không bao giờ chia sẻ Discord token của bạn.
- Việc sử dụng user token tự động có thể vi phạm Terms of Service của Discord. **Sử dụng có rủi ro bị ban tài khoản.**
