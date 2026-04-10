/**
 * Mô hình xác suất để đánh giá rủi ro.
 * Được chuyển đổi từ ProbabilityModel.java.
 */
export class ProbabilityModel {
  constructor(gridSize) {
    this.gridSize = gridSize;
  }

  /**
   * Tính toán rủi ro tai nạn cho một ô cụ thể dựa trên mật độ vật cản lân cận.
   * @param {Set} obstacles - Tập hợp các chuỗi "x,y" đại diện cho vật cản.
   * @param {object} pos - Vị trí hiện tại {x, y}.
   * @returns {number} Giá trị rủi ro từ 0 đến 1.
   */
  calculateRisk(obstacles, pos) {
    let obstacleCount = 0;
    const searchRadius = 2; // Bán kính quét rủi ro
    let totalNodesInRadius = 0;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;

        if (nx >= 0 && nx < this.gridSize && ny >= 0 && ny < this.gridSize) {
          totalNodesInRadius++;
          if (obstacles.has(`${nx},${ny}`)) {
            obstacleCount++;
          }
        }
      }
    }

    const density = obstacleCount / totalNodesInRadius;
    const environmentalFactor = Math.random() * 0.2; // 0-20% yếu tố rủi ro ngẫu nhiên
    
    // Rủi ro có trọng số: 80% mật độ + 20% yếu tố môi trường
    return (density * 0.8) + environmentalFactor;
  }

  /**
   * Dự đoán khả năng xảy ra tai nạn dựa trên ngưỡng rủi ro.
   */
  predictAccident(riskThreshold) {
    return Math.random() < riskThreshold;
  }
}
