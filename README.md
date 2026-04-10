# AEGIS-CORE: Autonomous Vehicle System v4.6

**AEGIS-CORE** là hệ thống mô phỏng vận hành xe tự hành (AV) cao cấp, được tích hợp các thuật toán AI tiên tiến để điều phối logistics và đảm bảo an toàn trong môi trường đô thị phức tạp. Dự án đã được nâng cấp toàn diện từ Java Desktop sang nền tảng Web Dashboard hiện đại.

## 🚀 Tính năng cốt lõi
- **A* Pathfinding**: Thuật toán tìm đường tối ưu, liên tục tính toán lại khi có vật cản động.
- **Safety Logic (XAI)**: Hệ thống tự động phanh và dừng khẩn cấp dựa trên khoảng cách cảm biến, giải thích quyết định bằng AI.
- **Chaos Engine**: Chế độ giả lập sự cố ngẫu nhiên thực tế (mất tín hiệu, vật cản bất ngờ).
- **Mission Analytics**: Lưu trữ vĩnh viễn mọi hành trình, thống kê khoảng cách, tốc độ và các sự cố trong cơ sở dữ liệu.
- **Tactical UI**: Giao diện điều phối Cyberpunk chuyên nghiệp với Radar Scan và hệ thống Telemetry thời gian thực.

## 🛠 Công nghệ sử dụng
- **Frontend**: React.js, Vite, Vanilla CSS (Tactical Design System).
- **Navigation/Logic**: JavaScript (A* Engine, Probability Risk Model).
- **Storage**: Browser LocalStorage (Persistence Archive).
- **Legacy Core**: Java Swing (Original Reference Logic).

## 📊 Hướng dẫn sử dụng
1. **Khởi chạy**: `cd web-app` -> `npm install` -> `npm run dev`.
2. **Thiết lập**: Sử dụng chuột để đặt Destination (Mục tiêu) và Hazards (Vật cản).
3. **Mô phỏng**: Nhấn **START/RESUME** để xe bắt đầu di chuyển. Có thể nhấn **PAUSE** để tạm dừng mà không kết thúc hành trình.
4. **Báo cáo**: Vào mục **VIEW ANALYTICS** để xem lịch sử hành trình. Tại đây bạn có thể nhấn **EXPORT .MD** để xuất báo cáo toàn bộ dữ liệu ra file Markdown.

---
*Dự án được phát triển bởi Antigravity AI Assistant.*
*Trạng thái: **DEPLOYED - MISSION READY***
