package com.ai.autonomous.model;

public class Node {
    public int x, y; // Tọa độ trên lưới (Grid coordinates)
    
    // Các giá trị thuật toán A*
    public int gCost; // Khoảng cách từ điểm bắt đầu (gCost)
    public int hCost; // Khoảng cách tới điểm kết thúc (hCost - heuristic)
    public int fCost; // Tổng chi phí (fCost = g + h)
    
    public Node parent;
    
    public boolean isObstacle = false;
    public boolean isStart = false;
    public boolean isTarget = false;
    public boolean isPath = false;
    
    // Mô hình hóa rủi ro/xác suất
    public double accidentRisk = 0.0; // Khoảng từ 0.0 đến 1.0

    public Node(int x, int y) {
        this.x = x;
        this.y = y;
    }
    
    public void calculateFCost() {
        this.fCost = gCost + hCost;
    }
    
    @Override
    public boolean equals(Object obj) {
        if (obj instanceof Node) {
            Node other = (Node) obj;
            return this.x == other.x && this.y == other.y;
        }
        return false;
    }
    
    @Override
    public int hashCode() {
        return x * 31 + y;
    }
}
