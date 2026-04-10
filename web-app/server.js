import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const DB_FILE = path.join(__dirname, 'database.json');

// Cấu hình Middleware an toàn
app.use(cors());
app.use(express.json());

// Dữ liệu mẫu ban đầu
const INITIAL_DB = {
  trips: [],
  logs: [],
  incidents: [],
  scenarios: [
    {
      name: 'Thành phố Mặc định',
      obstacles: ['5,5', '5,6', '6,5', '10,12', '11,12', '12,12'],
      waypoints: [{ x: 14, y: 14 }]
    }
  ]
};

// Khởi tạo file database nếu chưa tồn tại
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2));
}

// API: Lấy toàn bộ dữ liệu
app.get('/api/db', (req, res) => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (err) {
    res.status(500).json({ error: "Không thể đọc dữ liệu từ server." });
  }
});

// API: Lưu đè toàn bộ dữ liệu (Đảm bảo đồng bộ)
app.post('/api/db', (req, res) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Không thể ghi dữ liệu vào server." });
  }
});

// API: Xuất báo cáo ra file Markdown trực tiếp trên máy tính
app.post('/api/export', (req, res) => {
  try {
    const { filename, content } = req.body;
    const exportPath = path.join(__dirname, filename || 'REPORT.md');
    fs.writeFileSync(exportPath, content);
    res.json({ success: true, path: exportPath });
  } catch (err) {
    res.status(500).json({ error: "Không thể xuất file báo cáo." });
  }
});

app.listen(PORT, () => {
  console.log(`Backend AEGIS-CORE đang chạy tại: http://localhost:${PORT}`);
  console.log(`Dữ liệu đang được lưu tại: ${DB_FILE}`);
});
