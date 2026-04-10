package com.ai.autonomous.view;

import com.ai.autonomous.util.DatabaseLink;
import java.awt.*;
import java.util.List;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

public class AnalyticsDialog extends JDialog {
    private DatabaseLink db;

    public AnalyticsDialog(Frame owner, DatabaseLink db) {
        super(owner, "System Analytics & Performance Report", true);
        this.db = db;
        
        setLayout(new BorderLayout());
        setSize(800, 400);
        setLocationRelativeTo(owner);

        // Tiêu đề (Header)
        JPanel header = new JPanel();
        header.setBackground(new Color(52, 73, 94));
        JLabel title = new JLabel("Autonomous Vehicle Mission History");
        title.setForeground(Color.WHITE);
        title.setFont(new Font("Arial", Font.BOLD, 18));
        header.add(title);
        add(header, BorderLayout.NORTH);

        // Bảng Dữ liệu (Data Table)
        String[] columnNames = {"Trip ID", "Scenario", "Mission Info", "Start Time", "End Time", "Distance", "Status", "Incidents"};
        DefaultTableModel model = new DefaultTableModel(columnNames, 0);
        JTable table = new JTable(model);
        
        loadData(model);
        
        JScrollPane scrollPane = new JScrollPane(table);
        add(scrollPane, BorderLayout.CENTER);

        // Chân trang / Tóm tắt (Footer / Summary)
        JPanel footer = new JPanel();
        JButton refreshBtn = new JButton("Refresh Data");
        refreshBtn.addActionListener(e -> {
            model.setRowCount(0);
            loadData(model);
        });
        footer.add(refreshBtn);
        add(footer, BorderLayout.SOUTH);
    }

    private void loadData(DefaultTableModel model) {
        List<Object[]> data = db.getAnalyticsData();
        for (Object[] row : data) {
            model.addRow(row);
        }
    }
}
