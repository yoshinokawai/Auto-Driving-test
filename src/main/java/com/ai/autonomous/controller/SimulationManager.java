package com.ai.autonomous.controller;

import com.ai.autonomous.engine.*;
import com.ai.autonomous.model.*;
import com.ai.autonomous.util.*;
import java.util.List;
import javax.swing.Timer;

public class SimulationManager {
    private Map map;
    private Vehicle vehicle;
    private PathFinder pathFinder;
    private ProbabilityModel riskModel;
    private DatabaseLink db;
    private List<Node> currentPath;
    private int pathIndex = 0;
    private Timer timer;
    private Runnable onUpdate;
    private int currentTripId = -1;
    private double tripDistance = 0.0;
    private String currentScenarioName = "Default";

    public SimulationManager(Map map, Vehicle vehicle, Runnable onUpdate) {
        this.map = map;
        this.vehicle = vehicle;
        this.onUpdate = onUpdate;
        this.pathFinder = new PathFinder(map);
        this.riskModel = new ProbabilityModel();
        this.db = new DatabaseLink();
        Config.loadFromDatabase(db);
        
        this.timer = new Timer(500, e -> step());
    }

    public void start() {
        if (map.getTargetNode() != null) {
            Node currentPos = map.getNode(vehicle.getX(), vehicle.getY());
            currentPath = pathFinder.findPath(currentPos, map.getTargetNode());
            pathIndex = 0;
            
            if (!currentPath.isEmpty()) {
                // Chỉ bắt đầu hành trình mới trong DB nếu chưa có hành trình nào đang hoạt động
                if (currentTripId == -1) {
                    String info = map.getMissionPlan().size() + " stops";
                    currentTripId = db.startTrip(info, currentScenarioName);
                    db.logEvent("Multi-stop Journey started on [" + currentScenarioName + "] (" + info + ")", "INFO");
                } else {
                    db.logEvent("Journey resumed (Trip " + currentTripId + ")", "INFO");
                }
                
                vehicle.setState(Vehicle.State.MOVING);
                vehicle.setLastDecision("Path found. Proceeding...");
                timer.start();
            } else {
                vehicle.setLastDecision("Path not found from current position!");
            }
        }
    }

    public void stop() {
        timer.stop();
        vehicle.setState(Vehicle.State.STOPPED);
        if (currentTripId != -1) {
            db.endTrip(currentTripId, tripDistance, "ABORTED");
            db.logEvent("Journey aborted by user", "WARNING");
        }
    }

    private void step() {
        if (pathIndex >= currentPath.size()) {
            // Đã đến một mục tiêu. Có còn mục tiêu nào khác không?
            if (map.getTargetNode() != null) {
                db.logEvent("Reached waypoint. Moving to next stop...", "INFO");
                map.popTarget();
            }

            Node nextTarget = map.getTargetNode();
            if (nextTarget != null) {
                Node currentPos = map.getNode(vehicle.getX(), vehicle.getY());
                List<Node> nextPath = pathFinder.findPath(currentPos, nextTarget);
                if (!nextPath.isEmpty()) {
                    currentPath = nextPath;
                    pathIndex = 0;
                    vehicle.setLastDecision("Heading to next waypoint...");
                    onUpdate.run();
                    return;
                }
            }

            // Đã đến tất cả các điểm trung gian (waypoints)
            vehicle.setState(Vehicle.State.STOPPED);
            vehicle.setLastDecision("Mission Accomplished! All stops reached.");
            db.endTrip(currentTripId, tripDistance, "SUCCESS");
            timer.stop();
            onUpdate.run();
            return;
        }

        Node nextNode = currentPath.get(pathIndex);
        
        // Đánh giá An toàn AI: Kiểm tra xem nút tiếp theo có bị chặn không
        if (nextNode.isObstacle) {
            vehicle.setState(Vehicle.State.REROUTING);
            vehicle.setLastDecision("Obstacle on path! Finding new route...");
            db.logIncident(currentTripId, "OBSTACLE_DETECTED", "Node (" + nextNode.x + "," + nextNode.y + ") is blocked.");
            recalculatePath();
        } else {
            // Đường đi thông thoáng, tiếp tục di chuyển.
            vehicle.setState(Vehicle.State.MOVING);
            vehicle.setLastDecision("Path clear. Proceeding to target.");
            vehicle.setPosition(nextNode.x, nextNode.y);
            pathIndex++;
            tripDistance += 1.0; // Khoảng cách dựa trên lưới tọa độ (grid)
            riskModel.calculateRisk(map, nextNode);
        }

        onUpdate.run();
    }

    private void recalculatePath() {
        Node currentPos = map.getNode(vehicle.getX(), vehicle.getY());
        List<Node> newPath = pathFinder.findPath(currentPos, map.getTargetNode());
        
        if (!newPath.isEmpty()) {
            currentPath = newPath;
            pathIndex = 0;
            vehicle.setState(Vehicle.State.REROUTING);
            vehicle.setLastDecision("New path segments found. Recalculating...");
            db.logIncident(currentTripId, "REROUTING", "Successfully found alternate route.");
        } else {
            // Thực sự bị chặn - Kiểm tra xem cả 4 hướng có bị chặn không
            if (isCompletelyBlocked(currentPos)) {
                vehicle.setState(Vehicle.State.TRAPPED);
                vehicle.setLastDecision("TRAPPED! All exits blocked.");
                db.logIncident(currentTripId, "TRAPPED", "All 4 directions are blocked at (" + currentPos.x + "," + currentPos.y + ").");
                db.endTrip(currentTripId, tripDistance, "FAILED_TRAPPED");
            } else {
                vehicle.setState(Vehicle.State.STOPPED);
                vehicle.setLastDecision("Blocked! Target unreachable.");
                db.endTrip(currentTripId, tripDistance, "FAILED_PATH_BLOCKED");
            }
            timer.stop();
        }
    }

    private boolean isCompletelyBlocked(Node node) {
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        for (int i = 0; i < 4; i++) {
            Node neighbor = map.getNode(node.x + dr[i], node.y + dc[i]);
            if (neighbor != null && !neighbor.isObstacle) {
                return false; // Đã tìm thấy lối ra
            }
        }
        return true;
    }

    public void handleMapChange() {
        Node currentTarget = map.getTargetNode();
        Node currentPos = map.getNode(vehicle.getX(), vehicle.getY());

        // Kiểm tra xem mục tiêu có bị di chuyển so với điểm cuối của đường đi hiện tại không
        boolean targetMoved = false;
        if (currentTarget == null) {
            return; // Không có mục tiêu để lập lộ trình
        }
        
        if (currentPath == null || currentPath.isEmpty()) {
            targetMoved = true;
        } else {
            Node pathEnd = currentPath.get(currentPath.size() - 1);
            if (pathEnd.x != currentTarget.x || pathEnd.y != currentTarget.y) {
                targetMoved = true;
            }
        }

        if (targetMoved || vehicle.getState() == Vehicle.State.STOPPED || vehicle.getState() == Vehicle.State.TRAPPED) {
            // Tính toán lại lộ trình từ vị trí hiện tại đến mục tiêu mới
            List<Node> newPath = pathFinder.findPath(currentPos, currentTarget);
            if (!newPath.isEmpty()) {
                currentPath = newPath;
                pathIndex = 0;
                vehicle.setState(Vehicle.State.STOPPED);
                vehicle.setLastDecision("Destination updated. Ready to start.");
                db.logEvent("Target changed. Path updated.", "INFO");
                currentTripId = -1; // Buộc tạo ID Hành trình mới ở lần Bắt đầu tiếp theo
            } else {
                vehicle.setLastDecision("Target moved, but it's unreachable!");
            }
        } else if (vehicle.getState() == Vehicle.State.MOVING) {
            // Đường đi có thể bị chặn bởi vật cản mới, kiểm tra nút tiếp theo
            if (pathIndex < currentPath.size()) {
                Node nextNode = currentPath.get(pathIndex);
                if (nextNode.isObstacle) {
                    recalculatePath();
                }
            }
        }
    }

    public void reset() {
        timer.stop();
        Node startNode = map.getStartNode();
        if (startNode != null) {
            vehicle.setPosition(startNode.x, startNode.y);
        }
        vehicle.setState(Vehicle.State.STOPPED);
        vehicle.setLastDecision("System Reset. Ready.");
        map.resetAStar();
        map.clearPath();
        map.restoreMissionPlan(); // Khôi phục các điểm trung gian ban đầu để thử lại/lưu
        pathIndex = 0;
        currentTripId = -1;
        tripDistance = 0.0;
        if (currentPath != null) currentPath.clear();
        onUpdate.run();
    }

    public int getCurrentTripId() {
        return currentTripId;
    }

    public void setCurrentScenarioName(String name) {
        this.currentScenarioName = name;
    }

    public String getCurrentScenarioName() {
        return currentScenarioName;
    }

    public DatabaseLink getDatabase() {
        return db;
    }
}
