package com.ai.autonomous.view;

import com.ai.autonomous.model.Map;
import com.ai.autonomous.model.Node;
import com.ai.autonomous.model.Vehicle;
import com.ai.autonomous.util.Config;
import java.awt.*;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import javax.swing.JPanel;

public class MapPanel extends JPanel {
    private Map map;
    private Vehicle vehicle;
    private Runnable onMapChanged;
    private boolean targetSelectionMode = false;
    private boolean isAddingWaypoint = false;

    public MapPanel(Map map, Vehicle vehicle, Runnable onMapChanged) {
        this.map = map;
        this.vehicle = vehicle;
        this.onMapChanged = onMapChanged;
        setPreferredSize(new Dimension(Config.GRID_COLS * Config.TILE_SIZE, Config.GRID_ROWS * Config.TILE_SIZE));
        setBackground(Config.COLOR_BG);

        addMouseListener(new MouseAdapter() {
            @Override
            public void mousePressed(MouseEvent e) {
                int r = e.getY() / Config.TILE_SIZE;
                int c = e.getX() / Config.TILE_SIZE;
                Node node = map.getNode(r, c);
                if (node != null) {
                    if (targetSelectionMode) {
                        if (!node.isStart && !node.isObstacle) {
                            map.setTarget(r, c);
                            targetSelectionMode = false;
                        }
                    } else if (isAddingWaypoint) {
                        if (!node.isStart && !node.isObstacle) {
                            map.addWaypoint(r, c);
                            isAddingWaypoint = false;
                        }
                    } else {
                        if (e.getButton() == MouseEvent.BUTTON1) {
                            if (!node.isStart && !node.isTarget) {
                                node.isObstacle = !node.isObstacle;
                            }
                        } else if (e.getButton() == MouseEvent.BUTTON3) {
                            if (!node.isStart && !node.isObstacle) {
                                map.addWaypoint(r, c);
                            }
                        }
                    }
                    if (onMapChanged != null) onMapChanged.run();
                    repaint();
                }
            }
        });
    }

    public void setTargetSelectionMode(boolean active) {
        this.targetSelectionMode = active;
    }

    public void setAddingWaypointMode(boolean active) {
        this.isAddingWaypoint = active;
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2d = (Graphics2D) g;

        // Vẽ các Nút (Nodes)
        for (int r = 0; r < map.getRows(); r++) {
            for (int c = 0; c < map.getCols(); c++) {
                Node node = map.getNode(r, c);
                
                if (node.isObstacle) {
                    g2d.setColor(Config.COLOR_OBSTACLE);
                } else if (node.isTarget) {
                    // Mục tiêu hiện tại đang hoạt động
                    if (map.getWaypoints().indexOf(node) == 0) {
                        g2d.setColor(Config.COLOR_TARGET);
                    } else {
                        // Các điểm trung gian tiếp theo (Màu xanh lơ)
                        g2d.setColor(new Color(52, 152, 219, 150));
                    }
                } else if (node.isPath) {
                    g2d.setColor(Config.COLOR_PATH);
                } else {
                    g2d.setColor(Config.COLOR_BG);
                }
                
                g2d.fillRect(c * Config.TILE_SIZE, r * Config.TILE_SIZE, Config.TILE_SIZE, Config.TILE_SIZE);
                
                // Hiển thị số thứ tự điểm trung gian
                if (node.isTarget) {
                    int idx = map.getWaypoints().indexOf(node) + 1;
                    g2d.setColor(Color.WHITE);
                    g2d.drawString(String.valueOf(idx), c * Config.TILE_SIZE + 10, r * Config.TILE_SIZE + 15);
                }
                
                // Hiển thị mức độ rủi ro (nhẹ nhàng)
                if (node.accidentRisk > 0.5) {
                    g2d.setColor(new Color(255, 0, 0, (int)(node.accidentRisk * 100)));
                    g2d.fillRect(c * Config.TILE_SIZE, r * Config.TILE_SIZE, Config.TILE_SIZE, Config.TILE_SIZE);
                }

                g2d.setColor(Config.COLOR_GRID);
                g2d.drawRect(c * Config.TILE_SIZE, r * Config.TILE_SIZE, Config.TILE_SIZE, Config.TILE_SIZE);
            }
        }

        // Vẽ Xe
        g2d.setColor(Config.COLOR_VEHICLE);
        int vx = vehicle.getY() * Config.TILE_SIZE + 5;
        int vy = vehicle.getX() * Config.TILE_SIZE + 5;
        g2d.fillOval(vx, vy, Config.TILE_SIZE - 10, Config.TILE_SIZE - 10);
        
        // Chỉ báo hướng di chuyển
        g2d.setColor(Color.WHITE);
        g2d.fillOval(vx + 10, vy + 5, 4, 4);
    }
}
