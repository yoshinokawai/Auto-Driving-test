/**
 * Các quy tắc logic an toàn cho xe tự hành.
 * Được chuyển đổi từ SafetyLogic.java và tùy chỉnh cho ứng dụng web.
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
   * Đánh giá tình huống hiện tại dựa trên các quy tắc logic vị từ (FOL).
   * @param {number} distanceToObstacle - Khoảng cách đến vật cản gần nhất.
   * @param {number} currentSpeed - Tốc độ hiện tại của xe (km/h).
   * @param {boolean} sensorFailure - Trạng thái lỗi cảm biến.
   * @returns {string} Một trong các hằng số hành động của SafetyLogic.
   */
  evaluate(distanceToObstacle, currentSpeed, sensorFailure = false) {
    // Quy tắc 1: Dừng khẩn cấp
    // FOL: ∀(o) Vật cản(o) ∧ Khoảng cách(v, o) <= 1.0 → Dừng(v)
    if (distanceToObstacle <= 1.0) {
      return this.Action.EMERGENCY_STOP;
    }

    // Quy tắc 2: Phanh giảm tốc
    if (distanceToObstacle < this.Config.SAFETY_THRESHOLD) {
      return this.Action.BRAKE;
    }

    // Quy tắc 3: Lỗi cảm biến
    if (sensorFailure) {
      return this.Action.CAUTIOUS_DRIVE;
    }

    // Quy tắc 4: Tốc độ cao bất thường
    if (currentSpeed > this.Config.MAX_SAFE_SPEED && distanceToObstacle < this.Config.SAFETY_THRESHOLD * 2) {
      return this.Action.BRAKE;
    }

    return this.Action.CONTINUE;
  },

  /**
   * Trả về giải thích dễ hiểu (XAI) cho hành động của AI.
   */
  getXAIExplanation(action) {
    switch (action) {
      case this.Action.EMERGENCY_STOP:
        return "NGUY HIỂM: Nguy cơ va chạm trực diện! Đang kích hoạt phanh khẩn cấp.";
      case this.Action.BRAKE:
        return "CẢNH BÁO: Vật cản nằm trong vùng an toàn. Đang giảm tốc độ.";
      case this.Action.CAUTIOUS_DRIVE:
        return "THÔNG BÁO: Đang vận hành ở chế độ thận trọng do nhiễu cảm biến hoặc vùng rủi ro cao.";
      case this.Action.CONTINUE:
        return "TỐI ƯU: Đã quét môi trường. Đường đi thông thoáng, duy trì tốc độ.";
      default:
        return "HỆ THỐNG OK: Vận hành bình thường.";
    }
  }
};
