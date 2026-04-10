# AEGIS-CORE v5.0: Hệ thống Mô phỏng Xe tự hành & Điều phối Logistics

**AEGIS-CORE** là một nền tảng Web-App cao cấp được thiết kế để nghiên cứu và mô phỏng các kịch bản vận hành của xe tự hành (AV) trong môi trường đô thị phức tạp. Hệ thống tích hợp các thuật toán AI tiên tiến về tìm đường, logic an toàn giải thích được (XAI) và quản lý rủi ro thời gian thực.

---

## 🏛 Kiến trúc Hệ thống (System Architecture)

Dự án được xây dựng theo mô hình **Client-Server** đảm bảo tính ổn định và bảo mật dữ liệu:
- **Frontend**: React.js 19 tích hợp hệ thống thiết kế Cyberpunk Tactical UI.
- **Backend**: Node.js & Express Server xử lý lưu trữ vĩnh viễn (Persistence).
- **Database**: Hệ thống lưu trữ linh hoạt bằng file thực tế (`database.json`) giúp bảo toàn dữ liệu khi khởi động lại.

---

## 🧠 Các Thuật toán AI Cốt lõi

### 1. Tìm đường tối ưu (A* Pathfinding)
Sử dụng thuật toán **A*** (A-Star) để tìm kiếm đường đi ngắn nhất từ vị trí hiện tại đến mục tiêu:
- **Hàm Heuristic**: Manhattan Distance giúp tính toán nhanh và hiệu quả trong lưới ô vuông (Grid map).
- **Re-routing**: Hệ thống tự động tính toán lại lộ trình ngay khi phát hiện vật cản mới xuất hiện trên đường đi.

### 2. Logic An toàn Vị từ (Safety Logic & XAI)
Hệ thống ra quyết định dựa trên các quy tắc logic vị từ (First-Order Logic):
- **Cảnh báo (Warning)**: Khi vật cản nằm trong phạm vi 3.0 đơn vị, xe tự động giảm tốc (Brake).
- **Dừng khẩn cấp (Emergency Stop)**: Khi khoảng cách dưới 1.0 đơn vị, kích hoạt phanh lập tức để tránh va chạm.
- **AI Giải thích được (XAI)**: Hệ thống cung cấp phản hồi bằng ngôn ngữ tự nhiên về lý do tại sao AI thực hiện hành động đó (Ví dụ: "Phanh khẩn cấp để tránh va chạm trực diện").

### 3. Mô hình Xác suất Rủi ro (Risk Probability Model)
Tính toán mức độ rủi ro (Risk Score) dựa trên mật độ vật cản xung quanh vị trí xe. Các vùng có rủi ro cao được hiển thị bằng màu sắc (Heatmap) trên bản đồ điều phối.

---

## 🚀 Tính năng Nổi bật

- **Tactical Dashboard**: Giao diện điều phối hiển thị Telemetry (tốc độ, quãng đường) và Radar Scan thời gian thực.
- **Scenario Manager**: Cho phép lưu, xoá và quản lý các kịch bản bản đồ khác nhau.
- **Mission Analytics**: Lưu trữ lịch sử mọi hành trình, bao gồm cả các hành trình hoàn thành và các sự cố bị kẹt đường.
- **Direct Export**: Tính năng xuất báo cáo chuyên nghiệp ra file `.md` trực tiếp vào ổ đĩa máy tính thông qua Backend.

---

## 🛠 Hướng dẫn Cài đặt & Vận hành

### Yêu cầu hệ thống
- **Node.js**: Phiên bản 18.x trở lên.
- **Trình duyệt**: Chrome, Edge hoặc Firefox (hỗ trợ tốt nhất trên các trình duyệt nhân Chromium).

### Các bước khởi chạy
1.  Mở terminal tại thư mục `web-app`.
2.  Cài đặt các thư viện cần thiết:
    ```bash
    npm install
    ```
3.  Khởi chạy đồng thời cả Backend và Frontend:
    ```bash
    npm run dev
    ```
4.  Truy cập hệ thống tại địa chỉ: `http://localhost:5173` (hoặc cổng hiển thị trên terminal).

---

## 📊 Hướng dẫn Trình bày Báo cáo
Trong thư mục dự án, bạn có thể tìm thấy các file dữ liệu phục vụ cho báo cáo:
- `web-app/database.json`: Chứa toàn bộ dữ liệu thô của hệ thống.
- `web-app/BAO_CAO_NHIEM_VU_...md`: Các bản báo cáo chi tiết từng nhiệm vụ (được tạo sau khi nhấn nút Export).

---
*Dự án hoàn thiện hệ thống điều phối xe tự hành an toàn.*
*Trạng thái hệ thống: **MISSION READY - STABLE v5.0***
