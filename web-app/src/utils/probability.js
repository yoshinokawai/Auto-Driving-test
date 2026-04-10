/**
 * Probability model for risk assessment.
 * Ported from ProbabilityModel.java
 */
export class ProbabilityModel {
  constructor(gridSize) {
    this.gridSize = gridSize;
  }

  /**
   * Calculates accident risk for a specific cell based on neighbor density.
   * @param {Set} obstacles - Set of strings "x,y" representing obstacles.
   * @param {object} pos - {x, y} position.
   * @returns {number} Risk value between 0 and 1.
   */
  calculateRisk(obstacles, pos) {
    let obstacleCount = 0;
    const searchRadius = 2;
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
    const environmentalFactor = Math.random() * 0.2; // 0-20% random risk factor
    
    // Weighted risk: 80% density + 20% environmental factor
    return (density * 0.8) + environmentalFactor;
  }

  /**
   * Predicts if an accident will occur given a risk threshold.
   */
  predictAccident(riskThreshold) {
    return Math.random() < riskThreshold;
  }
}
