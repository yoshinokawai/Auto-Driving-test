package com.ai.autonomous;

import com.ai.autonomous.engine.PathFinder;
import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;

public class PathfindingTest {
    
    @Test
    public void testOptimalPathFound() {
        Map map = new Map(10, 10);
        Node start = map.getNode(0, 0);
        Node target = map.getNode(0, 5);
        
        PathFinder pathFinder = new PathFinder(map);
        List<Node> path = pathFinder.findPath(start, target);
        
        assertFalse(path.isEmpty(), "Path should be found");
        assertEquals(6, path.size(), "Path length should be 6 (0 to 5 inclusive)");
    }
    
    @Test
    public void testPathBlocked() {
        Map map = new Map(5, 5);
        Node start = map.getNode(0, 0);
        Node target = map.getNode(0, 4);
        
        // Chặn tất cả các lối đi
        map.getNode(0, 1).isObstacle = true;
        map.getNode(1, 1).isObstacle = true;
        map.getNode(1, 0).isObstacle = true;
        
        PathFinder pathFinder = new PathFinder(map);
        List<Node> path = pathFinder.findPath(start, target);
        
        assertTrue(path.isEmpty(), "Path should not be found when blocked");
    }
}
