/**
 * Safety logic rules for the autonomous vehicle.
 * Ported from SafetyLogic.java and customized for the web app.
 */
export const SafetyLogic = {
  Action: {
    CONTINUE: 'CONTINUE',
    BRAKE: 'BRAKE',
    EMERGENCY_STOP: 'EMERGENCY_STOP',
    CAUTIOUS_DRIVE: 'CAUTIOUS'
  },

  Config: {
    SAFETY_THRESHOLD: 3.0,
    MAX_SAFE_SPEED: 40.0
  },

  /**
   * Evaluates the current situation based on FOL rules.
   * @param {number} distanceToObstacle - Distance to nearest obstacle.
   * @param {number} currentSpeed - Current vehicle speed in km/h.
   * @param {boolean} sensorFailure - Whether sensors are malfunctioning.
   * @returns {string} One of SafetyLogic.Action constants.
   */
  evaluate(distanceToObstacle, currentSpeed, sensorFailure = false) {
    // Rule 1: Emergency Stop Rule
    // FOL: ∀(o) Obstacle(o) ∧ Distance(v, o) <= 1.0 → Stop(v)
    if (distanceToObstacle <= 1.0) {
      return this.Action.EMERGENCY_STOP;
    }

    // Rule 2: Braking Rule
    if (distanceToObstacle < this.Config.SAFETY_THRESHOLD) {
      return this.Action.BRAKE;
    }

    // Rule 3: Sensor Failure Rule
    if (sensorFailure) {
      return this.Action.CAUTIOUS_DRIVE;
    }

    // Rule 4: High Speed Rule
    if (currentSpeed > this.Config.MAX_SAFE_SPEED && distanceToObstacle < this.Config.SAFETY_THRESHOLD * 2) {
      return this.Action.BRAKE;
    }

    return this.Action.CONTINUE;
  },

  /**
   * Returns a human-friendly explanation for the AI's action.
   */
  getXAIExplanation(action) {
    switch (action) {
      case this.Action.EMERGENCY_STOP:
        return "CRITICAL: Immediate obstacle collision risk! Engaging emergency brakes.";
      case this.Action.BRAKE:
        return "ADVISORY: Obstacle within safety envelope. Reducing velocity.";
      case this.Action.CAUTIOUS_DRIVE:
        return "NOTICE: Operating in cautious mode due to sensor noise or high-risk zone.";
      case this.Action.CONTINUE:
        return "OPTIMAL: Environment scanned. Path clear for high-speed transit.";
      default:
        return "SYSTEM OK: Normal operation.";
    }
  }
};
