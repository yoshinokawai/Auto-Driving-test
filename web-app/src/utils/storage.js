/**
 * Simulated Database using localStorage.
 * Handles Trips, Logs, Incidents, and Scenarios.
 */

const STORAGE_KEY = 'AEGIS_SYSTEM_DB_V4'; // Bumped version to reset potentially corrupted data

const INITIAL_DB = {
  trips: [],
  logs: [],
  incidents: [],
  scenarios: [
    {
      name: 'Default City',
      obstacles: ['5,5', '5,6', '6,5', '10,12', '11,12', '12,12'],
      waypoints: [{ x: 14, y: 14 }]
    },
    {
      name: 'Urban Maze',
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

  _load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DB));
      return INITIAL_DB;
    }
    return JSON.parse(raw);
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  logEvent(msg, type = 'INFO') {
    const entry = { id: Date.now(), msg, type, time: new Date().toISOString() };
    this.data.logs.unshift(entry);
    this.data.logs = this.data.logs.slice(0, 100);
    this._save();
    return entry;
  }

  logIncident(tripId, type, msg) {
    const entry = { id: Date.now(), tripId: tripId || 'N/A', type, msg, time: new Date().toISOString() };
    this.data.incidents.unshift(entry);
    this._save();
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
    this._save();
    return trip;
  }

  updateTripDistance(id, distance) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.distance = distance;
      this._save();
    }
  }

  endTrip(id, distance, status) {
    const trip = this.data.trips.find(t => t.id === id);
    if (trip) {
      trip.endTime = new Date().toISOString();
      trip.distance = distance;
      trip.status = status;
      this._save();
    }
  }

  saveScenario(name, obstacles, waypoints) {
    const idx = this.data.scenarios.findIndex(s => s.name === name);
    const scenario = { name, obstacles: Array.from(obstacles), waypoints };
    if (idx >= 0) this.data.scenarios[idx] = scenario;
    else this.data.scenarios.push(scenario);
    this._save();
  }

  deleteScenario(name) {
    this.data.scenarios = this.data.scenarios.filter(s => s.name !== name);
    this._save();
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
