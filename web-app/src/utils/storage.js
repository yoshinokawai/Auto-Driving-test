/**
 * Công cụ Quản lý Dữ liệu bền vững: Tích hợp Node.js Backend
 */

const API_URL = 'http://localhost:5000/api/db';

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

class Database {
  constructor() {
    this.data = INITIAL_DB;
    this.listeners = [];
    this.syncWithServer();
  }

  // Cho phép App đăng ký nhận thông báo khi dữ liệu thay đổi
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.data));
  }

  async syncWithServer() {
    try {
      const response = await fetch(API_URL);
      if (response.ok) {
        this.data = await response.json();
        console.log("AEGIS-DB: Đã đồng bộ thành công với Server.");
        this.notify();
      }
    } catch (err) {
      console.warn("AEGIS-DB: Không thể kết nối với Backend, đang dùng dữ liệu tạm thời.");
    }
  }

  async _persist() {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
      this.notify();
    } catch (err) {
      console.error("AEGIS-DB: Lỗi khi lưu dữ liệu vào Backend.");
    }
  }

  logEvent(msg, type = 'INFO') {
    const entry = { id: Date.now(), msg, type, time: new Date().toISOString() };
    this.data.logs.unshift(entry);
    this.data.logs = this.data.logs.slice(0, 100);
    this._persist();
    return entry;
  }

  logIncident(tripId, type, msg) {
    const entry = { id: Date.now(), tripId: tripId || 'N/A', type, msg, time: new Date().toISOString() };
    this.data.incidents.unshift(entry);
    this._persist();
    return entry;
  }

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
    this._persist();
    return trip;
  }

  updateTripDistance(id, distance) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.distance = distance;
      this._persist();
    }
  }

  endTrip(id, distance, status) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.endTime = new Date().toISOString();
      trip.distance = distance;
      trip.status = status;
      this._persist();
    }
  }

  saveScenario(name, obstacles, waypoints) {
    const idx = this.data.scenarios.findIndex(s => s.name === name);
    const scenario = { name, obstacles: Array.from(obstacles), waypoints };
    if (idx >= 0) this.data.scenarios[idx] = scenario;
    else this.data.scenarios.push(scenario);
    this._persist();
  }

  deleteScenario(name) {
    this.data.scenarios = this.data.scenarios.filter(s => s.name !== name);
    this._persist();
  }

  getScenarios() {
    return this.data.scenarios;
  }

  getHistory() {
    return {
      trips: this.data.trips,
      incidents: this.data.incidents,
      logs: this.data.logs.slice(0, 50)
    };
  }
}

export const db = new Database();
