package com.ai.autonomous.model;

import com.ai.autonomous.util.Config;
import java.util.ArrayList;
import java.util.List;

public class Map {
    private Node[][] grid;
    private int rows, cols;
    private Node startNode;
    private java.util.List<Node> waypoints = new java.util.ArrayList<>();
    private java.util.List<Node> missionPlan = new java.util.ArrayList<>();

    public Map(int rows, int cols) {
        this.rows = rows;
        this.cols = cols;
        this.grid = new Node[rows][cols];
        initializeGrid();
    }

    private void initializeGrid() {
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                grid[r][c] = new Node(r, c);
            }
        }
    }

    public Node getNode(int r, int c) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
            return grid[r][c];
        }
        return null;
    }

    public List<Node> getNeighbors(Node node) {
        List<Node> neighbors = new ArrayList<>();
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};

        for (int i = 0; i < 4; i++) {
            Node neighbor = getNode(node.x + dr[i], node.y + dc[i]);
            if (neighbor != null && !neighbor.isObstacle) {
                neighbors.add(neighbor);
            }
        }
        return neighbors;
    }

    public void setStart(int r, int c) {
        if (startNode != null) startNode.isStart = false;
        startNode = getNode(r, c);
        if (startNode != null) startNode.isStart = true;
    }

    public void setTarget(int r, int c) {
        // Hành vi cũ/Đặt lại: Xóa tất cả và đặt một mục tiêu duy nhất
        clearWaypoints();
        addWaypoint(r, c);
    }

    public void addWaypoint(int r, int c) {
        Node node = getNode(r, c);
        if (node != null && !node.isStart && !node.isObstacle) {
            if (!missionPlan.contains(node)) {
                node.isTarget = true;
                waypoints.add(node);
                missionPlan.add(node);
            }
        }
    }

    public void popTarget() {
        if (!waypoints.isEmpty()) {
            Node reached = waypoints.remove(0);
            reached.isTarget = false;
        }
    }

    public List<Node> getWaypoints() {
        return waypoints;
    }

    public void clearWaypoints() {
        for (Node n : missionPlan) n.isTarget = false;
        waypoints.clear();
        missionPlan.clear();
    }

    public java.util.List<Node> getMissionPlan() {
        return missionPlan;
    }

    public void restoreMissionPlan() {
        waypoints.clear();
        for (Node n : missionPlan) {
            n.isTarget = true;
            waypoints.add(n);
        }
    }

    public Node getStartNode() { return startNode; }
    public Node getTargetNode() { 
        return waypoints.isEmpty() ? null : waypoints.get(0); 
    }
    public int getRows() { return rows; }
    public int getCols() { return cols; }

    public void clearPath() {
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                grid[r][c].isPath = false;
            }
        }
    }

    public void resetAStar() {
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                grid[r][c].gCost = Integer.MAX_VALUE;
                grid[r][c].hCost = 0;
                grid[r][c].fCost = 0;
                grid[r][c].parent = null;
                grid[r][c].isPath = false;
            }
        }
    }

    public void setRandomTarget() {
        java.util.Random rnd = new java.util.Random();
        int r, c;
        do {
            r = rnd.nextInt(rows);
            c = rnd.nextInt(cols);
        } while (grid[r][c].isObstacle || grid[r][c].isStart);
        setTarget(r, c);
    }
}
