package com.ai.autonomous.view;

import com.ai.autonomous.model.Vehicle;
import java.awt.*;
import javax.swing.*;
import javax.swing.border.EmptyBorder;

public class Dashboard extends JPanel {
    private Vehicle vehicle;
    private JLabel tripIdLabel;
    private JLabel statusLabel;
    private JLabel decisionLabel;
    private JLabel speedLabel;
    private JTextArea logArea;

    public Dashboard(Vehicle vehicle) {
        this.vehicle = vehicle;
        setLayout(new BorderLayout());
        setPreferredSize(new Dimension(250, 0));
        setBorder(new EmptyBorder(10, 10, 10, 10));
        setBackground(new Color(245, 245, 245));

        JPanel statsPanel = new JPanel();
        statsPanel.setOpaque(false);
        statsPanel.setLayout(new BoxLayout(statsPanel, BoxLayout.Y_AXIS));

        tripIdLabel = createStyledLabel("Trip ID: None");
        tripIdLabel.setForeground(new Color(127, 140, 141));
        statusLabel = createStyledLabel("Status: STOPPED");
        speedLabel = createStyledLabel("Speed: 0.0 km/h");
        decisionLabel = createStyledLabel("AI Thinking...");
        decisionLabel.setForeground(new Color(41, 128, 185));

        statsPanel.add(tripIdLabel);
        statsPanel.add(Box.createVerticalStrut(10));
        statsPanel.add(statusLabel);
        statsPanel.add(Box.createVerticalStrut(10));
        statsPanel.add(speedLabel);
        statsPanel.add(Box.createVerticalStrut(10));
        statsPanel.add(new JLabel("Last Decision:"));
        statsPanel.add(decisionLabel);

        add(statsPanel, BorderLayout.NORTH);

        logArea = new JTextArea();
        logArea.setEditable(false);
        logArea.setFont(new Font("Monospaced", Font.PLAIN, 11));
        JScrollPane scroll = new JScrollPane(logArea);
        scroll.setBorder(BorderFactory.createTitledBorder("System Logs"));
        
        add(scroll, BorderLayout.CENTER);
    }

    private JLabel createStyledLabel(String text) {
        JLabel label = new JLabel(text);
        label.setFont(new Font("SansSerif", Font.BOLD, 14));
        return label;
    }

    public void updateInfo(int currentTripId) {
        if (currentTripId == -1) {
            tripIdLabel.setText("Trip ID: None");
        } else {
            tripIdLabel.setText("Trip ID: #" + currentTripId);
        }
        statusLabel.setText("Status: " + vehicle.getState());
        speedLabel.setText(String.format("Speed: %.1f nodes/s", vehicle.getSpeed()));
        decisionLabel.setText("<html><body style='width: 180px'>" + vehicle.getLastDecision() + "</body></html>");
        
        // Thêm vào nhật ký nếu có sự thay đổi
        String lastDec = vehicle.getLastDecision();
        if (!logArea.getText().contains(lastDec)) {
            logArea.append("> " + lastDec + "\n");
        }
    }
}
