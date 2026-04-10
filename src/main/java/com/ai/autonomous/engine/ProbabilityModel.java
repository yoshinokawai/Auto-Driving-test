package com.ai.autonomous.engine;

import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import com.ai.autonomous.util.Config;

import java.util.Random;

public class ProbabilityModel {
    private Random random = new Random();

    /**
     * Tính toán rủi ro xảy ra tai nạn tại một nút cụ thể.
     * Xác suất dựa trên mật độ vật cản cục bộ và một yếu tố "môi trường" ngẫu nhiên.
     */
    public double calculateRisk(Map map, Node node) {
        int obstacleCount = 0;
        int searchRadius = 2;
        int totalNodesInRadius = 0;

        for (int r = node.x - searchRadius; r <= node.x + searchRadius; r++) {
            for (int c = node.y - searchRadius; c <= node.y + searchRadius; c++) {
                Node neighbor = map.getNode(r, c);
                if (neighbor != null) {
                    totalNodesInRadius++;
                    if (neighbor.isObstacle) {
                        obstacleCount++;
                    }
                }
            }
        }

        double density = (double) obstacleCount / totalNodesInRadius;
        double environmentalFactor = random.nextDouble() * 0.2; // Rủi ro ngẫu nhiên từ 0% đến 20%
        
        node.accidentRisk = (density * 0.8) + environmentalFactor;
        return node.accidentRisk;
    }

    public boolean predictAccident(double riskThreshold) {
        // Dự đoán xác suất đơn giản
        return random.nextDouble() < riskThreshold;
    }
}
