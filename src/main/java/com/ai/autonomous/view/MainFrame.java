package com.ai.autonomous.view;

import com.ai.autonomous.controller.*;
import com.ai.autonomous.model.*;
import com.ai.autonomous.util.Config;
import java.awt.*;
import javax.swing.*;

public class MainFrame extends JFrame {
    private Map map;
    private Vehicle vehicle;
    private SimulationManager simulationManager;
    private IncidentGenerator incidentGenerator;
    
    private MapPanel mapPanel;
    private Dashboard dashboard;

    public MainFrame() {
        setTitle("AI Autonomous Vehicle System - Simulation");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLayout(new BorderLayout());

        // Khởi tạo Dữ liệu
        map = new Map(Config.GRID_ROWS, Config.GRID_COLS);
        map.setStart(2, 2);
        map.setRandomTarget();
        
        vehicle = new Vehicle(2, 2);
        
        // Các Thành phần giao diện
        dashboard = new Dashboard(vehicle);
        mapPanel = new MapPanel(map, vehicle, () -> {
            simulationManager.handleMapChange();
        });
        
        // Mô phỏng
        simulationManager = new SimulationManager(map, vehicle, () -> {
            mapPanel.repaint();
            dashboard.updateInfo(simulationManager.getCurrentTripId());
        });
        
        incidentGenerator = new IncidentGenerator(map);

        // Bảng Điều khiển
        JPanel controls = new JPanel();
        JButton startBtn = new JButton("Start/Continue");
        startBtn.addActionListener(e -> simulationManager.start());
        
        JButton stopBtn = new JButton("Stop/Abort");
        stopBtn.addActionListener(e -> simulationManager.stop());
        
        JButton resetBtn = new JButton("Reset Mission");
        resetBtn.addActionListener(e -> {
            map.setRandomTarget();
            simulationManager.reset();
        });
        
        JButton chaosBtn = new JButton("Trigger Random Incident");
        chaosBtn.addActionListener(e -> {
            // incidentGenerator.triggerRandomObstacle();
            incidentGenerator.spawnObstacleNear(vehicle.getX(), vehicle.getY());
            mapPanel.repaint();
        });

        JButton saveBtn = new JButton("Save Scenario");
        saveBtn.addActionListener(e -> {
            String name = JOptionPane.showInputDialog(this, "Enter Scenario Name:");
            if (name != null && !name.trim().isEmpty()) {
                simulationManager.getDatabase().saveMap(name, map);
                simulationManager.setCurrentScenarioName(name);
                JOptionPane.showMessageDialog(this, "Scenario '" + name + "' saved successfully!");
            }
        });

        JButton loadBtn = new JButton("Load Scenario");
        loadBtn.addActionListener(e -> {
            String name = JOptionPane.showInputDialog(this, "Enter Scenario Name to Load:");
            if (name != null && !name.trim().isEmpty()) {
                if (simulationManager.getDatabase().loadMap(name, map)) {
                    simulationManager.setCurrentScenarioName(name);
                    simulationManager.reset();
                    mapPanel.repaint();
                    JOptionPane.showMessageDialog(this, "Scenario '" + name + "' loaded successfully!");
                }
            }
        });

        JButton browseBtn = new JButton("Browse Scenarios");
        browseBtn.addActionListener(e -> {
            java.util.List<String> names = simulationManager.getDatabase().getAllScenarioNames();
            if (names.isEmpty()) {
                JOptionPane.showMessageDialog(this, "No saved scenarios found in database.");
                return;
            }
            
            String selected = (String) JOptionPane.showInputDialog(this, 
                "Select a Scenario to Load:", 
                "Saved Scenarios", 
                JOptionPane.QUESTION_MESSAGE, 
                null, 
                names.toArray(), 
                names.get(0));
                
            if (selected != null) {
                if (simulationManager.getDatabase().loadMap(selected, map)) {
                    simulationManager.setCurrentScenarioName(selected);
                    simulationManager.reset();
                    mapPanel.repaint();
                    JOptionPane.showMessageDialog(this, "Scenario '" + selected + "' loaded successfully!");
                }
            }
        });

        JButton deleteBtn = new JButton("Delete Scenario");
        deleteBtn.addActionListener(e -> {
            java.util.List<String> names = simulationManager.getDatabase().getAllScenarioNames();
            if (names.isEmpty()) {
                JOptionPane.showMessageDialog(this, "No saved scenarios found in database.");
                return;
            }
            
            String selected = (String) JOptionPane.showInputDialog(this, 
                "Select a Scenario to Delete:", 
                "Delete Scenario", 
                JOptionPane.WARNING_MESSAGE, 
                null, 
                names.toArray(), 
                names.get(0));
                
            if (selected != null) {
                int confirm = JOptionPane.showConfirmDialog(this, 
                    "Are you sure you want to delete '" + selected + "' permanently?", 
                    "Confirm Deletion", 
                    JOptionPane.YES_NO_OPTION, 
                    JOptionPane.WARNING_MESSAGE);
                    
                if (confirm == JOptionPane.YES_OPTION) {
                    simulationManager.getDatabase().deleteMap(selected);
                    JOptionPane.showMessageDialog(this, "Scenario '" + selected + "' deleted.");
                }
            }
        });
        
        JButton reportBtn = new JButton("View Analytics Report");
        reportBtn.addActionListener(e -> {
            AnalyticsDialog dialog = new AnalyticsDialog(this, simulationManager.getDatabase());
            dialog.setVisible(true);
        });

        JButton setTargetBtn = new JButton("Set Destination");
        setTargetBtn.setForeground(new java.awt.Color(41, 128, 185));
        setTargetBtn.addActionListener(e -> {
            mapPanel.setTargetSelectionMode(true);
            JOptionPane.showMessageDialog(this, "Target Selection Mode Active.\nPlease click on the map to set a new destination.");
        });

        JButton addStopBtn = new JButton("Add Waypoint");
        addStopBtn.addActionListener(e -> {
            mapPanel.setAddingWaypointMode(true);
            JOptionPane.showMessageDialog(this, "Add Waypoint Mode Active.\nPlease click on the map to add a stop to the route.");
        });

        controls.add(startBtn);
        controls.add(stopBtn);
        controls.add(resetBtn);
        controls.add(chaosBtn);
        controls.add(saveBtn);
        controls.add(loadBtn);
        controls.add(browseBtn);
        controls.add(deleteBtn);
        controls.add(reportBtn);
        controls.add(setTargetBtn);
        controls.add(addStopBtn);

        add(mapPanel, BorderLayout.CENTER);
        add(dashboard, BorderLayout.EAST);
        add(controls, BorderLayout.SOUTH);

        pack();
        setLocationRelativeTo(null);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new MainFrame().setVisible(true);
        });
    }
}
