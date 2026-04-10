package com.ai.autonomous.util;

import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import java.sql.*;

public class DatabaseLink {
    
    static {
        try {
            Class.forName("org.sqlite.JDBC");
        } catch (ClassNotFoundException e) {
            javax.swing.JOptionPane.showMessageDialog(null, "Database Driver Missing: sqlite-jdbc JAR not found in classpath!", "DB Error", javax.swing.JOptionPane.ERROR_MESSAGE);
        }
    }
    
    public DatabaseLink() {
        try (Connection conn = DriverManager.getConnection(Config.DB_URL)) {
            if (conn != null) {
                Statement stmt = conn.createStatement();
                
                // 1. Bảng Nhật ký (Cơ bản)
                stmt.execute("CREATE TABLE IF NOT EXISTS logs (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP," +
                        "event TEXT, severity TEXT);");

                // 2. Bảng Bản đồ (Quản lý Kịch bản)
                stmt.execute("CREATE TABLE IF NOT EXISTS maps (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "name TEXT UNIQUE, rows INTEGER, cols INTEGER," +
                        "startX INTEGER, startY INTEGER, " +
                        "waypoints_data TEXT, obstacles TEXT);");

                // 3. Bảng Sự cố (Hộp đen)
                stmt.execute("CREATE TABLE IF NOT EXISTS incidents (" +
                        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "tripId INTEGER, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP," +
                        "type TEXT, description TEXT);");

                // 4. Bảng Phân tích (Hiệu suất)
                stmt.execute("CREATE TABLE IF NOT EXISTS analytics (" +
                        "tripId INTEGER PRIMARY KEY AUTOINCREMENT," +
                        "scenario_name TEXT DEFAULT 'Default', " +
                        "mission_info TEXT, " +
                        "startTime DATETIME DEFAULT CURRENT_TIMESTAMP," +
                        "endTime DATETIME, distance REAL, status TEXT);");

                // 5. Bảng Cấu hình (Cơ sở Tri thức)
                stmt.execute("CREATE TABLE IF NOT EXISTS config (" +
                        "key TEXT PRIMARY KEY, value TEXT, description TEXT);");

                // Nạp cấu hình ban đầu nếu bảng còn trống
                seedConfig(conn);
            }
        } catch (SQLException e) {
            javax.swing.JOptionPane.showMessageDialog(null, "DB Init Error: " + e.getMessage(), "Database Error", javax.swing.JOptionPane.ERROR_MESSAGE);
        }
    }

    private void seedConfig(Connection conn) throws SQLException {
        String[][] initialData = {
            {"active_heuristic", "MANHATTAN", "Select A* heuristic: MANHATTAN or EUCLIDEAN"},
            {"safety_threshold", "2.5", "Minimum safety distance (nodes) to trigger braking."},
            {"max_speed", "40", "Maximum vehicle speed for this scenario."},
            {"reroute_on_accident", "TRUE", "Enable automatic rerouting on incident detection."}
        };
        String sql = "INSERT OR IGNORE INTO config(key, value, description) VALUES(?, ?, ?)";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (String[] row : initialData) {
                pstmt.setString(1, row[0]);
                pstmt.setString(2, row[1]);
                pstmt.setString(3, row[2]);
                pstmt.executeUpdate();
            }
        }
    }

    public String getConfigValue(String key) {
        String sql = "SELECT value FROM config WHERE key = ?";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, key);
            try (ResultSet rs = pstmt.executeQuery()) {
                if (rs.next()) return rs.getString("value");
            }
        } catch (SQLException e) {
            System.err.println("DB Config Query Error: " + e.getMessage());
        }
        return null;
    }

    public void logEvent(String event, String severity) {
        String sql = "INSERT INTO logs(event, severity) VALUES(?, ?)";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, event);
            pstmt.setString(2, severity);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            // Ghi nhật ký âm thầm hay xử lý? Hiện tại hiển thị thông báo để gỡ lỗi
            javax.swing.JOptionPane.showMessageDialog(null, "DB Log Error: " + e.getMessage(), "Database Error", javax.swing.JOptionPane.ERROR_MESSAGE);
        }
    }

    public void logIncident(int tripId, String type, String desc) {
        String sql = "INSERT INTO incidents(tripId, type, description) VALUES(?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setInt(1, tripId);
            pstmt.setString(2, type);
            pstmt.setString(3, desc);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("DB Incident Log Error: " + e.getMessage());
        }
    }

    public int startTrip(String missionInfo, String scenarioName) {
        String sql = "INSERT INTO analytics(status, mission_info, scenario_name) VALUES('IN_PROGRESS', ?, ?)";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setString(1, missionInfo);
            pstmt.setString(2, scenarioName);
            pstmt.executeUpdate();
            ResultSet rs = pstmt.getGeneratedKeys();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) {
            javax.swing.JOptionPane.showMessageDialog(null, "DB trip Start Error: " + e.getMessage(), "Database Error", javax.swing.JOptionPane.ERROR_MESSAGE);
        }
        return -1;
    }

    public void endTrip(int tripId, double distance, String status) {
        String sql = "UPDATE analytics SET endTime = CURRENT_TIMESTAMP, distance = ?, status = ? WHERE tripId = ?";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setDouble(1, distance);
            pstmt.setString(2, status);
            pstmt.setInt(3, tripId);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("DB Trip End Error: " + e.getMessage());
        }
    }

    public void saveMap(String name, com.ai.autonomous.model.Map map) {
        StringBuilder obsSb = new StringBuilder();
        for (int r = 0; r < map.getRows(); r++) {
            for (int c = 0; c < map.getCols(); c++) {
                if (map.getNode(r, c).isObstacle) {
                    obsSb.append(r).append(",").append(c).append(";");
                }
            }
        }
        
        StringBuilder wpSb = new StringBuilder();
        for (Node n : map.getMissionPlan()) {
            wpSb.append(n.x).append(",").append(n.y).append(";");
        }
        
        String sql = "INSERT OR REPLACE INTO maps(name, rows, cols, startX, startY, waypoints_data, obstacles) " +
                     "VALUES(?, ?, ?, ?, ?, ?, ?)";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            
            Node start = map.getStartNode();
            
            if (start == null || map.getMissionPlan().isEmpty()) {
                javax.swing.JOptionPane.showMessageDialog(null, "Cannot save: Map must have a Start and at least one Destination!", "Save Error", javax.swing.JOptionPane.WARNING_MESSAGE);
                return;
            }

            pstmt.setString(1, name);
            pstmt.setInt(2, map.getRows());
            pstmt.setInt(3, map.getCols());
            pstmt.setInt(4, start.x);
            pstmt.setInt(5, start.y);
            pstmt.setString(6, wpSb.toString());
            pstmt.setString(7, obsSb.toString());
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("DB Map Save Error: " + e.getMessage());
        }
    }

    public java.util.List<String> getAllScenarioNames() {
        java.util.List<String> names = new java.util.ArrayList<>();
        String sql = "SELECT name FROM maps ORDER BY name ASC";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                names.add(rs.getString("name"));
            }
        } catch (SQLException e) {
            System.err.println("DB Error List Scenarios: " + e.getMessage());
        }
        return names;
    }

    public void deleteMap(String name) {
        String sql = "DELETE FROM maps WHERE name = ?";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, name);
            pstmt.executeUpdate();
        } catch (SQLException e) {
            System.err.println("DB Map Delete Error: " + e.getMessage());
        }
    }

    public boolean loadMap(String name, com.ai.autonomous.model.Map map) {
        String sql = "SELECT * FROM maps WHERE name = ?";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, name);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                for (int r = 0; r < map.getRows(); r++) {
                    for (int c = 0; c < map.getCols(); c++) {
                        Node n = map.getNode(r, c);
                        n.isObstacle = false;
                        n.isTarget = false;
                    }
                }
                map.clearWaypoints();
                
                // Thiết lập điểm Bắt đầu
                map.setStart(rs.getInt("startX"), rs.getInt("startY"));
                
                // Phân tích các điểm trung gian (waypoints)
                String waypointsData = rs.getString("waypoints_data");
                if (waypointsData != null && !waypointsData.isEmpty()) {
                    for (String nodeStr : waypointsData.split(";")) {
                        String[] coords = nodeStr.split(",");
                        map.addWaypoint(Integer.parseInt(coords[0]), Integer.parseInt(coords[1]));
                    }
                }
                
                // Phân tích các vật cản
                String obs = rs.getString("obstacles");
                if (obs != null && !obs.isEmpty()) {
                    for (String node : obs.split(";")) {
                        String[] coords = node.split(",");
                        int r = Integer.parseInt(coords[0]);
                        int c = Integer.parseInt(coords[1]);
                        map.getNode(r, c).isObstacle = true;
                    }
                }
                return true;
            } else {
                javax.swing.JOptionPane.showMessageDialog(null, "Scenario '" + name + "' not found!", "Load Error", javax.swing.JOptionPane.ERROR_MESSAGE);
                return false;
            }
        } catch (SQLException e) {
            System.err.println("DB Map Load Error: " + e.getMessage());
            return false;
        }
    }

    public java.util.List<Object[]> getAnalyticsData() {
        java.util.List<Object[]> data = new java.util.ArrayList<>();
        String sql = "SELECT a.tripId, a.scenario_name, a.mission_info, a.startTime, a.endTime, a.distance, a.status, " +
                     "(SELECT COUNT(*) FROM incidents i WHERE i.tripId = a.tripId) as incidentCount " +
                     "FROM analytics a ORDER BY a.tripId DESC";
        try (Connection conn = DriverManager.getConnection(Config.DB_URL);
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                data.add(new Object[]{
                    rs.getInt("tripId"),
                    rs.getString("scenario_name"),
                    rs.getString("mission_info"),
                    rs.getString("startTime"),
                    rs.getString("endTime"),
                    rs.getDouble("distance"),
                    rs.getString("status"),
                    rs.getInt("incidentCount")
                });
            }
        } catch (SQLException e) {
            System.err.println("DB Analytics Query Error: " + e.getMessage());
        }
        return data;
    }
}
