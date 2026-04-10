/**
 * Cơ sở dữ liệu mô phỏng sử dụng localStorage.
 * Quản lý Hành trình, Nhật ký, Sự cố và Kịch bản bản đồ.
 */

const STORAGE_KEY = 'AEGIS_SYSTEM_DB_V4'; // Tăng phiên bản để đặt lại dữ liệu nếu cần

const INITIAL_DB = {
  trips: [],
  logs: [],
  incidents: [],
  scenarios: [
    {
      name: 'Thành phố Mặc định',
      obstacles: ['5,5', '5,6', '6,5', '10,12', '11,12', '12,12'],
      waypoints: [{ x: 14, y: 14 }]
    },
    {
      name: 'Mê cung Đô thị',
      obstacles: ['2,2', '2,3', '2,4', '4,2', '5,2', '6,2', '8,8', '8,9', '8,10', '10,8', '11,8'],
      waypoints: [{ x: 12, y: 12 }]
    }
  ],
  config: {
    max_speed: 40,
    safety_threshold: 2.5
  }
};

class Database {
  constructor() {
    this.data = this._load();
  }

  // Tải dữ liệu từ localStorage
  _load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return INITIAL_DB;
    }
    return JSON.parse(raw);
  }

  // Lưu dữ liệu vào localStorage
  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  // Ghi nhật ký sự kiện hệ thống
  logEvent(msg, type = 'INFO') {
    const entry = { id: Date.now(), msg, type, time: new Date().toISOString() };
    this.data.logs.unshift(entry);
    this.data.logs = this.data.logs.slice(0, 100); // Giới hạn 100 dòng log gần nhất
    this._save();
    return entry;
  }

  // Ghi nhận sự cố trong hành trình
  logIncident(tripId, type, msg) {
    const entry = { id: Date.now(), tripId: tripId || 'N/A', type, msg, time: new Date().toISOString() };
    this.data.incidents.unshift(entry);
    this._save();
    return entry;
  }

  // Bắt đầu một hành trình mới
  startTrip(missionInfo, scenarioName) {
    const trip = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      endTime: null,
      missionInfo,
      scenarioName,
      distance: 0,
      status: 'IN_PROGRESS'
    };
    this.data.trips.unshift(trip);
    this._save();
    return trip;
  }

  // Cập nhật quãng đường di chuyển của hành trình
  updateTripDistance(id, distance) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.distance = distance;
      this._save();
    }
  }

  // Kết thúc hành trình và lưu trạng thái cuối cùng
  endTrip(id, distance, status) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.endTime = new Date().toISOString();
      trip.distance = distance;
      trip.status = status;
      this._save();
    }
  }

  // Lưu cấu hình bản đồ (kịch bản)
  saveScenario(name, obstacles, waypoints) {
    const idx = this.data.scenarios.findIndex(s => s.name === name);
    const scenario = { name, obstacles: Array.from(obstacles), waypoints };
    if (idx >= 0) this.data.scenarios[idx] = scenario;
    else this.data.scenarios.push(scenario);
    this._save();
  }

  // Xoá kịch bản bản đồ
  deleteScenario(name) {
    this.data.scenarios = this.data.scenarios.filter(s => s.name !== name);
    this._save();
  }

  getScenarios() {
    return this.data.scenarios;
  }

  // Lấy toàn bộ dữ liệu lịch sử
  getHistory() {
    return {
      trips: this.data.trips,
      incidents: this.data.incidents,
      logs: this.data.logs.slice(0, 50)
    };
  }
}

export const db = new Database();
