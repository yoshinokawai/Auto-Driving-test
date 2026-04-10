package com.ai.autonomous.model;

import com.ai.autonomous.util.Config;

public class Vehicle {
    public enum State { MOVING, BRAKING, STOPPED, CRASHED, REROUTING, TRAPPED }

    private int x, y; // Vị trí trên lưới tọa độ (Position on grid)
    private State currentState = State.STOPPED;
    private double currentSpeed = 0.0;
    private String lastDecision = "Waiting for path...";

    public Vehicle(int startX, int startY) {
        this.x = startX;
        this.y = startY;
    }

    public void setPosition(int x, int y) {
        this.x = x;
        this.y = y;
    }

    public int getX() { return x; }
    public int getY() { return y; }

    public State getState() { return currentState; }
    public void setState(State state) { this.currentState = state; }

    public double getSpeed() { return currentSpeed; }
    public void setSpeed(double speed) { this.currentSpeed = speed; }

    public String getLastDecision() { return lastDecision; }
    public void setLastDecision(String lastDecision) { this.lastDecision = lastDecision; }

    public void update(int targetX, int targetY) {
        // Logic di chuyển cơ bản được xử lý bởi SimulationManager
    }
}
