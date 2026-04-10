package com.ai.autonomous.engine;

import com.ai.autonomous.model.Vehicle;
import com.ai.autonomous.util.Config;

public class SafetyLogic {
    
    public enum Action { CONTINUE, BRAKE, EMERGENCY_STOP, CAUTIOUS_DRIVE }

    public static Action evaluate(double distanceToObstacle, double currentSpeed, boolean sensorFailure) {
        // Quy tắc Logic 1: Quy tắc Dừng khẩn cấp
        // FOL: Với mọi(o) Vật cản(o) ^ Khoảng cách(v, o) < ngưỡng -> Dừng(v)
        if (distanceToObstacle <= 1.0) {
            return Action.EMERGENCY_STOP;
        }

        // Quy tắc Logic 2: Quy tắc Phanh
        if (distanceToObstacle < Config.SAFETY_THRESHOLD) {
            return Action.BRAKE;
        }

        // Quy tắc Logic 3: Quy tắc Lỗi Cảm biến
        if (sensorFailure) {
            return Action.CAUTIOUS_DRIVE;
        }

        // Quy tắc Logic 4: Quy tắc Tốc độ cao
        if (currentSpeed > Config.MAX_SAFE_SPEED && distanceToObstacle < Config.SAFETY_THRESHOLD * 2) {
            return Action.BRAKE;
        }

        return Action.CONTINUE;
    }

    public static String getXAIExplanation(Action action) {
        return switch (action) {
            case EMERGENCY_STOP -> "EMERGENCY STOP: Immediate obstacle detected!";
            case BRAKE -> "BRAKING: Obstacle within safety threshold.";
            case CAUTIOUS_DRIVE -> "CAUTIOUS: Potential sensor inaccuracy or risk nearby.";
            case CONTINUE -> "SYSTEM OK: Proceeding to target.";
        };
    }
}
