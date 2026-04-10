package com.ai.autonomous.engine;

import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import java.util.*;

public class PathFinder {
    private Map map;

    public PathFinder(Map map) {
        this.map = map;
    }

    public List<Node> findPath(Node start, Node target) {
        if (start == null || target == null) return new ArrayList<>();

        map.resetAStar();
        PriorityQueue<Node> openSet = new PriorityQueue<>(Comparator.comparingInt(n -> n.fCost));
        Set<Node> closedSet = new HashSet<>();

        start.gCost = 0;
        start.hCost = calculateHeuristic(start, target);
        start.calculateFCost();
        openSet.add(start);

        while (!openSet.isEmpty()) {
            Node current = openSet.poll();
            closedSet.add(current);

            if (current.equals(target)) {
                return reconstructPath(current);
            }

            for (Node neighbor : map.getNeighbors(current)) {
                if (closedSet.contains(neighbor)) continue;

                int newGCost = current.gCost + 1; // Giả định chi phí đồng nhất cho lưới tọa độ
                if (newGCost < neighbor.gCost || !openSet.contains(neighbor)) {
                    neighbor.gCost = newGCost;
                    neighbor.hCost = calculateHeuristic(neighbor, target);
                    neighbor.calculateFCost();
                    neighbor.parent = current;

                    if (!openSet.contains(neighbor)) {
                        openSet.add(neighbor);
                    }
                }
            }
        }

        return new ArrayList<>(); // Không tìm thấy đường đi
    }

    private int calculateHeuristic(Node a, Node b) {
        if ("EUCLIDEAN".equalsIgnoreCase(com.ai.autonomous.util.Config.ACTIVE_HEURISTIC)) {
            return (int) Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
        }
        // Mặc định: Khoảng cách Manhattan
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private List<Node> reconstructPath(Node targetNode) {
        List<Node> path = new ArrayList<>();
        Node current = targetNode;
        while (current != null) {
            path.add(current);
            current.isPath = true;
            current = current.parent;
        }
        Collections.reverse(path);
        return path;
    }
}
