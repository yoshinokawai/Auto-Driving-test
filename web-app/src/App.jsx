import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PathFinder } from './utils/pathfinding';
import { SafetyLogic } from './utils/safety';
import { ProbabilityModel } from './utils/probability';
import { db } from './utils/storage';
import './App.css';

const GRID_SIZE = 15;

function App() {
  // --- Công cụ tính toán cốt lõi ---
  const pathFinder = useMemo(() => new PathFinder(GRID_SIZE, GRID_SIZE), []);
  const riskModel = useMemo(() => new ProbabilityModel(GRID_SIZE), []);

  // --- Trạng thái Bản đồ & Nhiệm vụ ---
  const [vehiclePos, setVehiclePos] = useState({ x: 0, y: 0 });
  const [missionPlan, setMissionPlan] = useState([{ x: 14, y: 14 }]);
  const [obstacles, setObstacles] = useState(new Set(db.getScenarios()[0]?.obstacles || []));
  const [riskMap, setRiskMap] = useState({});
  const [showRiskMap, setShowRiskMap] = useState(false);
  const [selectionMode, setSelectionMode] = useState('WAYPOINT'); // 'WAYPOINT': Điểm đích, 'OBSTACLE': Vật cản

  // --- Trạng thái Mô phỏng ---
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoIncident, setAutoIncident] = useState(false);
  const [vehicleState, setVehicleState] = useState('IDLE');
  const [lastDecision, setLastDecision] = useState('Hệ thống sẵn sàng triển khai');
  const [currentTripId, setCurrentTripId] = useState(null);

  // --- Trạng thái Dữ liệu & UI ---
  const [logs, setLogs] = useState(db.getHistory().logs);
  const [history, setHistory] = useState(db.getHistory());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [scenarios, setScenarios] = useState(db.getScenarios());
  const [scenarioNameInput, setScenarioNameInput] = useState("");
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [telemetry, setTelemetry] = useState({ speed: 0, distance: 0, confidence: 100 });

  // --- Tham chiếu (Refs) ---
  const activePathRef = useRef([]);
  const pathIndexRef = useRef(0);

  // --- Khởi tạo ---
  useEffect(() => {
    updateRiskMap(obstacles);
  }, [obstacles]);

  // --- Cập nhật Tự động từ Database ---
  useEffect(() => {
    const unsubscribe = db.subscribe((data) => {
      setScenarios([...data.scenarios]);
      setLogs([...data.logs.slice(0, 50)]);
      setHistory({...db.getHistory()});
    });
    return () => unsubscribe();
  }, []);

  const updateRiskMap = useCallback((currentObstacles) => {
    const newMap = {};
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        newMap[`${x},${y}`] = riskModel.calculateRisk(currentObstacles, { x, y });
      }
    }
    setRiskMap(newMap);
  }, [riskModel]);

  // --- Đồng bộ Cơ sở dữ liệu ---
  const addLog = (msg, type = 'INFO') => {
    const entry = db.logEvent(msg, type);
    setLogs(prev => [entry, ...prev.slice(0, 49)]);
  };

  const addIncident = (type, msg) => {
    db.logIncident(currentTripId, type, msg);
    addLog(`SỰ CỐ [${type}]: ${msg}`, 'DANGER');
    setHistory(db.getHistory());
  };

  const calculatePath = useCallback((start, target, currentObstacles) => {
    const newPath = pathFinder.findPath(start, target, currentObstacles);
    return newPath;
  }, [pathFinder]);

  // --- Bộ máy tạo Sự cố Tự động ---
  useEffect(() => {
    if (!autoIncident || !isSimulating || isPaused) return;
    const chaosInterval = setInterval(() => {
      if (Math.random() < 0.2) {
        handleRandomIncident();
      }
    }, 3000);
    return () => clearInterval(chaosInterval);
  }, [autoIncident, isSimulating, isPaused, vehiclePos, missionPlan]);

  const handleRandomIncident = () => {
    const x = Math.max(0, Math.min(GRID_SIZE - 1, vehiclePos.x + (Math.random() > 0.5 ? 1 : -1)));
    const y = Math.max(0, Math.min(GRID_SIZE - 1, vehiclePos.y + (Math.random() > 0.5 ? 1 : -1)));
    
    if (`${x},${y}` !== `${vehiclePos.x},${vehiclePos.y}` && !missionPlan.some(p => p.x === x && p.y === y)) {
      setObstacles(prev => {
        const next = new Set(prev);
        next.add(`${x},${y}`);
        return next;
      });
      addLog(`RADAR: Phát hiện vật cản bất ngờ tại [${x},${y}]`, 'WARNING');
    }
  };

  // --- Vòng lặp Mô phỏng ---
  useEffect(() => {
    if (!isSimulating || isPaused) return;

    const tick = setInterval(() => {
      if (pathIndexRef.current >= activePathRef.current.length) {
        // Logic xử lý Điểm đích (Waypoint)
        if (missionPlan.length > 1) {
          const nextPlan = [...missionPlan];
          nextPlan.shift();
          setMissionPlan(nextPlan);
          addLog(`Đã đến điểm trung chuyển. Đang chuyển hướng...`, 'SUCCESS');
          const nextPath = calculatePath(vehiclePos, nextPlan[0], obstacles);
          activePathRef.current = nextPath;
          pathIndexRef.current = 0;
        } else {
          setIsSimulating(false);
          setVehicleState('STOPPED');
          db.endTrip(currentTripId, telemetry.distance, 'SUCCESS');
          setHistory(db.getHistory());
          addLog("Nhiệm vụ hoàn tất. Đang phân tích dữ liệu.", "SUCCESS");
        }
        return;
      }

      const nextNode = activePathRef.current[pathIndexRef.current];
      
      // Đánh giá An toàn
      const sensorDist = obstacles.has(`${nextNode.x},${nextNode.y}`) ? 0.5 : 1.5;
      const action = SafetyLogic.evaluate(sensorDist, telemetry.speed);
      setLastDecision(SafetyLogic.getXAIExplanation(action));

      if (action === SafetyLogic.Action.EMERGENCY_STOP || obstacles.has(`${nextNode.x},${nextNode.y}`)) {
        setVehicleState('REROUTING');
        const rPath = calculatePath(vehiclePos, missionPlan[0], obstacles);
        if (rPath.length > 0) {
          activePathRef.current = rPath;
          pathIndexRef.current = 0;
          addIncident('OBSTACLE', 'Phát hiện vật cản. Đang tìm đường vòng...');
        } else {
          setIsSimulating(false);
          setVehicleState('STOPPED');
          addIncident('TRAPPED', 'Mọi lối đi đã bị chặn. Dừng hệ thống.');
          db.endTrip(currentTripId, telemetry.distance, 'FAILED');
          setHistory(db.getHistory());
        }
        return;
      }

      setVehiclePos(nextNode);
      pathIndexRef.current++;
      setVehicleState(action === SafetyLogic.Action.BRAKE ? 'BRAKING' : 'MOVING');
      const newDistance = telemetry.distance + 1;
      setTelemetry(t => ({
        ...t,
        speed: action === SafetyLogic.Action.BRAKE ? 12 : 45,
        distance: newDistance
      }));
      db.updateTripDistance(currentTripId, newDistance);
    }, 600);

    return () => clearInterval(tick);
  }, [isSimulating, isPaused, missionPlan, obstacles, vehiclePos, telemetry.speed, currentTripId, calculatePath]);

  // --- Bộ điều khiển ---
  const handleStartContinue = () => {
    if (isPaused) {
      setIsPaused(false);
      setVehicleState('MOVING');
      addLog("Tiếp tục lộ trình.");
      return;
    }

    // Luôn ghi lại bản ghi hành trình để đảm bảo lưu trữ
    const missionName = scenarioNameInput || scenarios[selectedScenarioIdx]?.name || "Bản đồ tùy chỉnh";
    const trip = db.startTrip(`${missionPlan.length} điểm dừng`, missionName);
    setCurrentTripId(trip.id);

    const launchPath = calculatePath(vehiclePos, missionPlan[0], obstacles);
    if (launchPath.length > 0) {
      activePathRef.current = launchPath;
      pathIndexRef.current = 0;
      setIsSimulating(true);
      setIsPaused(false);
      setVehicleState('MOVING');
      addLog(`Khởi động hành trình #${trip.id.toString().slice(-4)}`);
    } else {
      setLastDecision("Mục tiêu không thể tiếp cận!");
      db.endTrip(trip.id, 0, 'FAILED_PATH');
      setHistory(db.getHistory());
      addLog("Khởi động thất bại: Không tìm thấy đường đi.", "DANGER");
    }
  };

  const handlePause = () => {
    if (!isSimulating) return;
    setIsPaused(true);
    setVehicleState('PAUSED');
    addLog("Đã tạm dừng nhiệm vụ.");
  };

  const handleAbort = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setVehicleState('STOPPED');
    if (currentTripId) {
      db.endTrip(currentTripId, telemetry.distance, 'ABORTED');
      setHistory(db.getHistory());
      addLog("Đã hủy bỏ hành trình.", "WARNING");
    }
  };

  const saveScenario = () => {
    const name = scenarioNameInput.trim();
    if (!name) { alert("Vui lòng nhập tên kịch bản."); return; }
    db.saveScenario(name, obstacles, missionPlan);
    setScenarios([...db.getScenarios()]);
    addLog(`Đã lưu cấu hình bản đồ: '${name}'`);
  };

  const deleteScenario = () => {
    // Ưu tiên: Tên từ ô nhập liệu, nếu không dùng mục đang chọn từ danh sách
    const nameToDelete = scenarioNameInput.trim() || scenarios[selectedScenarioIdx]?.name;
    
    if (!nameToDelete) {
      alert("Chưa chọn kịch bản để xoá.");
      return;
    }

    setShowConfirmDelete(true);
  };

  const confirmDeleteScenario = () => {
    const nameToDelete = scenarioNameInput.trim() || scenarios[selectedScenarioIdx]?.name;
    db.deleteScenario(nameToDelete);
    const updated = db.getScenarios();
    setScenarios([...updated]);
    setScenarioNameInput("");
    setSelectedScenarioIdx(0);
    setShowConfirmDelete(false);
    addLog(`Đã xoá kịch bản '${nameToDelete}' khỏi bộ nhớ.`, "WARNING");
  };

  const loadScenario = (index) => {
    const s = scenarios[index];
    if (!s) return;
    setSelectedScenarioIdx(index);
    setObstacles(new Set(s.obstacles));
    setMissionPlan(s.waypoints);
    setScenarioNameInput(s.name);
    setVehiclePos({ x: 0, y: 0 });
    setIsSimulating(false);
    setIsPaused(false);
    addLog(`Đã tải cấu hình: ${s.name}`);
  };

  const exportToMarkdown = async () => {
    const data = db.getHistory();
    let md = `# BÁO CÁO NHIỆM VỤ AEGIS-CORE\n\n`;
    md += `Thời gian tạo: ${new Date().toLocaleString()}\n\n`;
    
    md += `## LỊCH SỬ HÀNH TRÌNH\n\n| ID | KỊCH BẢN | THỜI GIAN | QUÃNG ĐƯỜNG | TRẠNG THÁI |\n|---|---|---|---|---|\n`;
    (data.trips || []).forEach(t => {
      const idStr = t.id ? t.id.toString().slice(-4) : "N/A";
      md += `| #${idStr} | ${t.scenarioName || '---'} | ${new Date(t.startTime).toLocaleTimeString()} | ${t.distance || 0}U | ${t.status} |\n`;
    });

    md += `\n## NHẬT KÝ SỰ CỐ\n\n`;
    if (!data.incidents || data.incidents.length === 0) md += `*Không có sự cố nào được ghi nhận.*\n`;
    else data.incidents.forEach(inc => {
      const tripIdStr = inc.tripId ? inc.tripId.toString().slice(-4) : "N/A";
      md += `- **${inc.type}**: ${inc.msg} (Mã hành trình: ${tripIdStr})\n`;
    });

    try {
      const fileName = `BAO_CAO_NHIEM_VU_${Date.now()}.md`;
      const response = await fetch('http://localhost:5000/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileName, content: md })
      });
      if (response.ok) {
        addLog(`Báo cáo đã lưu vào máy tính: ${fileName}`, "SUCCESS");
        alert(`BÁO CÁO ĐÃ ĐƯỢC LƯU TRỰC TIẾP!\nHãy vào thư mục 'web-app' để thấy file: ${fileName}`);
      }
    } catch (err) {
      addLog("Lỗi server khi lưu báo cáo.", "DANGER");
    }
  };

  return (
    <div className="app-container tactical-bg">
      <header className="main-header glass-panel">
        <div className="title-group">
          <h1 className="neon">AEGIS-CORE <span className="term-text">HỆ THỐNG ĐIỀU PHỐI</span></h1>
          <p className="term-text" style={{letterSpacing: '5px'}}>LOGISTICS & TỰ HÀNH v4.6</p>
        </div>
        <div className="state-monitor">
          <div className="monitor-value" data-state={vehicleState}>
             {vehicleState === 'IDLE' ? 'SẴN SÀNG' : 
              vehicleState === 'MOVING' ? 'ĐANG CHẠY' : 
              vehicleState === 'PAUSED' ? 'TẠM DỪNG' : 
              vehicleState === 'STOPPED' ? 'ĐÃ DỪNG' : 
              vehicleState === 'BRAKING' ? 'ĐANG PHANH' : 
              vehicleState === 'REROUTING' ? 'CHUYỂN HƯỚNG' : vehicleState}
          </div>
          <div className="term-text">TRẠNG THÁI HỆ THỐNG</div>
        </div>
      </header>

      <div className="main-content">
        <aside className="side-panel left glass-panel">
          <div className="telemetry-block">
            <h3>THÔNG SỐ VẬN HÀNH</h3>
            <div className="tactical-gauge">
              <div className="gauge-label">VẬN TỐC (KM/H)</div>
              <div className="gauge-value cyan">{telemetry.speed}</div>
            </div>
            <div className="tactical-gauge">
              <div className="gauge-label">QUÃNG ĐƯỜNG</div>
              <div className="gauge-value">{telemetry.distance.toFixed(1)}U</div>
            </div>
          </div>

          <div className="xai-block">
            <h3>LOGIC TRÍ TUỆ NHÂN TẠO (XAI)</h3>
            <div className="logic-output">
               <span className="cursor">{">"}</span> {lastDecision}
            </div>
          </div>

          <div className="scenarios-block">
             <h3>QUẢN LÝ KỊCH BẢN</h3>
             <div className="scenario-controls">
                <input 
                  className="tactical-input" 
                  placeholder="TÊN KỊCH BẢN..." 
                  value={scenarioNameInput} 
                  onChange={e => setScenarioNameInput(e.target.value)} 
                />
                <div className="save-row">
                  <button onClick={saveScenario} className="mini-btn" style={{flex: 1}}>LƯU BẢN ĐỒ</button>
                  <button onClick={deleteScenario} className="mini-btn danger" style={{flex: 1}}>XOÁ BẢN ĐỒ</button>
                </div>
                <select className="tactical-select" value={selectedScenarioIdx} onChange={(e) => loadScenario(parseInt(e.target.value))}>
                  {scenarios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
                </select>
             </div>
          </div>
        </aside>

        <section className="map-view-container glass-panel">
          <div className="grid-controls">
            <div className="interaction-modes">
              <button className={`mode-toggle ${selectionMode === 'WAYPOINT' ? 'active' : ''}`} data-mode="WAYPOINT" onClick={() => setSelectionMode('WAYPOINT')}>
                THÊM ĐÍCH ĐẾN
              </button>
              <button className={`mode-toggle ${selectionMode === 'OBSTACLE' ? 'active' : ''}`} data-mode="OBSTACLE" onClick={() => setSelectionMode('OBSTACLE')}>
                THÊM VẬT CẢN
              </button>
            </div>
            <button className={`mode-btn ${showRiskMap ? 'active' : ''}`} onClick={() => setShowRiskMap(!showRiskMap)}>
               QUÉT RADAR {showRiskMap ? 'ĐANG BẬT' : 'ĐANG TẮT'}
            </button>
          </div>
          <div className="simulation-grid">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE, y = Math.floor(i / GRID_SIZE);
              const isV = vehiclePos.x === x && vehiclePos.y === y;
              const isO = obstacles.has(`${x},${y}`);
              const isT = missionPlan.some(p => p.x === x && p.y === y);
              const risk = riskMap[`${x},${y}`] || 0;
              return (
                <div key={i} className="grid-cell"
                  data-vehicle={isV} data-obstacle={isO} data-target={isT} data-path={activePathRef.current.some(p=>p.x===x&&p.y===y)}
                  style={{ backgroundColor: showRiskMap ? `rgba(255, 62, 62, ${risk * 0.75})` : undefined }}
                  onClick={() => {
                    const k = `${x},${y}`;
                    if(isV) return;
                    if(selectionMode === 'OBSTACLE') setObstacles(o => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; });
                    else setMissionPlan(p => [...p, {x, y}]);
                  }}
                />
              )
            })}
          </div>
        </section>

        <aside className="side-panel right glass-panel">
          <div className="event-log">
             <h3>NHẬT KÝ HỆ THỐNG</h3>
             <div className="log-scroll">
                {logs.map((l, i) => (
                  <div key={i} className="log-row">
                    <span className="log-time">[{l.time.split('T')[1].split('.')[0]}]</span> {l.msg}
                  </div>
                ))}
             </div>
          </div>
          <button className="tact-btn action" onClick={() => {setHistory(db.getHistory()); setShowAnalytics(true)}}>XEM PHÂN TÍCH</button>
        </aside>
      </div>

      <footer className="tactical-footer glass-panel">
        <button className="tact-btn action" onClick={handleStartContinue} disabled={isSimulating && !isPaused}>BẮT ĐẦU / TIẾP TỤC</button>
        <button className="tact-btn warning" onClick={handlePause} disabled={!isSimulating || isPaused}>TẠM DỪNG</button>
        <button className="tact-btn danger" onClick={handleAbort} disabled={!isSimulating && !isPaused}>HUỶ BỎ / DỪNG</button>
        <button className="tact-btn neutral" onClick={() => { setVehiclePos({x:0,y:0}); setMissionPlan([{x:14,y:14}]); setTelemetry({speed:0,distance:0,confidence:100}); setObstacles(new Set()); addLog("Đã đặt lại hệ thống."); }}>GIAO DIỆN LẠI</button>
        <button className="tact-btn" onClick={handleRandomIncident}>TẠO VẬT CẢN NGẪU NHIÊN</button>
      </footer>

      {showConfirmDelete && (
        <div className="modal-overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="confirm-modal glass-panel" onClick={e => e.stopPropagation()}>
            <h2 className="neon" style={{fontSize: '1.2rem', marginBottom: '15px'}}>XÁC THỰC QUYỀN TRUY CẬP</h2>
            <p className="term-text" style={{fontSize: '0.8rem', color: '#fff', marginBottom: '20px'}}>
              XOÁ VĨNH VIỄN DỮ LIỆU: <span style={{color: 'var(--red-critical)'}}>{scenarioNameInput.trim() || scenarios[selectedScenarioIdx]?.name}</span>?
              HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC.
            </p>
            <div className="save-row" style={{gap: '15px'}}>
               <button className="tact-btn danger" style={{padding: '10px 20px', flex: 1}} onClick={confirmDeleteScenario}>XÁC NHẬN XOÁ</button>
               <button className="tact-btn" style={{padding: '10px 20px', flex: 1}} onClick={() => setShowConfirmDelete(false)}>HUỶ BỎ</button>
            </div>
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="modal-overlay" onClick={() => setShowAnalytics(false)}>
           <div className="analytics-modal glass-panel" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h2 className="neon">PHÂN TÍCH DỮ LIỆU NHIỆM VỤ</h2>
                 <div style={{display: 'flex', gap: '10px'}}>
                   <button className="tact-btn action" style={{padding: '5px 15px', fontSize: '0.6rem'}} onClick={exportToMarkdown}>XUẤT .MD</button>
                   <button className="close-btn" onClick={() => setShowAnalytics(false)}>ĐÓNG</button>
                 </div>
              </div>
              <div className="history-grid">
                 <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>Mã</th><th>Kịch bản</th><th>Thời gian</th><th>Q.Đường</th><th>Trạng thái</th></tr>
                      </thead>
                      <tbody>
                        {history.trips.map(t => (
                          <tr key={t.id}>
                            <td>#{t.id.toString().slice(-4)}</td>
                            <td>{t.scenarioName}</td>
                            <td>{new Date(t.startTime).toLocaleTimeString()}</td>
                            <td>{t.distance}U</td>
                            <td className={t.status === 'SUCCESS' ? 'green' : (t.status?.includes('FAILED') ? 'red' : 'cyan')}>
                               {t.status === 'SUCCESS' ? 'THÀNH CÔNG' : 
                                t.status === 'ABORTED' ? 'ĐÃ HUỶ' : 
                                t.status === 'FAILED_PATH' ? 'KHÔNG CÓ ĐƯỜNG' :
                                t.status === 'FAILED' ? 'THẤT BẠI' : t.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
                 <div className="incident-box">
                    <h3>BÁO CÁO SỰ CỐ</h3>
                    {history.incidents.map((inc, i) => (
                      <div key={i} className="incident-card">
                         <strong>{inc.type}</strong>: {inc.msg}
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
