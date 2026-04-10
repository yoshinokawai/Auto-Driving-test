package com.ai.autonomous.util;

import java.awt.Color;

public class Config {
    // Mạng lưới (Tạm thời để tĩnh)
    public static final int GRID_ROWS = 20;
    public static final int GRID_COLS = 30;
    public static final int TILE_SIZE = 30;

    // An toàn & AI (Động)
    public static double SAFETY_THRESHOLD = 3.0;
    public static double MAX_SAFE_SPEED = 2.0;
    public static String ACTIVE_HEURISTIC = "MANHATTAN";
    
    // Màu sắc Giao diện
    public static final Color COLOR_OBSTACLE = new Color(44, 62, 80);
    public static final Color COLOR_VEHICLE = new Color(231, 76, 60);
    public static final Color COLOR_PATH = new Color(46, 204, 113, 100);
    public static final Color COLOR_TARGET = new Color(52, 152, 219);
    public static final Color COLOR_GRID = new Color(200, 200, 200);
    public static final Color COLOR_BG = Color.WHITE;

    public static final int HEURISTIC_TYPE = 1; // 1: Manhattan, 2: Euclidean (Dạng khoảng cách)
    
    // Cơ sở dữ liệu
    public static final String DB_URL = "jdbc:sqlite:autonomous_system.db";

    public static void loadFromDatabase(DatabaseLink db) {
        String threshold = db.getConfigValue("safety_threshold");
        if (threshold != null) SAFETY_THRESHOLD = Double.parseDouble(threshold);
        
        String speed = db.getConfigValue("max_speed");
        if (speed != null) MAX_SAFE_SPEED = Double.parseDouble(speed);
        
        String heuristic = db.getConfigValue("active_heuristic");
        if (heuristic != null) ACTIVE_HEURISTIC = heuristic;
    }
}
