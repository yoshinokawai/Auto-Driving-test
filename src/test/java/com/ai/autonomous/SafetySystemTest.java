package com.ai.autonomous;

import com.ai.autonomous.engine.SafetyLogic;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class SafetySystemTest {
    
    @Test
    public void testEmergencyStopRule() {
        SafetyLogic.Action action = SafetyLogic.evaluate(0.5, 2.0, false);
        assertEquals(SafetyLogic.Action.EMERGENCY_STOP, action, "Should trigger emergency stop if distance is very low");
    }
    
    @Test
    public void testBrakingRule() {
        SafetyLogic.Action action = SafetyLogic.evaluate(2.5, 1.5, false);
        assertEquals(SafetyLogic.Action.BRAKE, action, "Should trigger braking if distance is within safety threshold");
    }
    
    @Test
    public void testSensorFailureRule() {
        SafetyLogic.Action action = SafetyLogic.evaluate(5.0, 1.0, true);
        assertEquals(SafetyLogic.Action.CAUTIOUS_DRIVE, action, "Should trigger cautious drive on sensor failure");
    }
}
