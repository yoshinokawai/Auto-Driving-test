package com.ai.autonomous.controller;

import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import java.util.Random;

public class IncidentGenerator {
    private Map map;
    private Random random = new Random();

    public IncidentGenerator(Map map) {
        this.map = map;
    }

    public void triggerRandomObstacle() {
        int r = random.nextInt(map.getRows());
        int c = random.nextInt(map.getCols());
        Node node = map.getNode(r, c);
        if (node != null && !node.isStart && !node.isTarget) {
            node.isObstacle = true;
        }
    }

    public void spawnObstacleNear(int x, int y) {
        // Tạo ra một vật cản trên đường đi của xe
        int[] dx = {1, 2, -1, -2, 0, 0};
        int[] dy = {0, 0, 0, 0, 1, 2};
        int i = random.nextInt(dx.length);
        Node node = map.getNode(x + dx[i], y + dy[i]);
        if (node != null && !node.isStart && !node.isTarget) {
            node.isObstacle = true;
        }
    }
}
