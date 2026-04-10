import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PathFinder } from './utils/pathfinding';
import { SafetyLogic } from './utils/safety';
import { ProbabilityModel } from './utils/probability';
import { db } from './utils/storage';
import './App.css';

const GRID_SIZE = 15;

function App() {
  // --- Core Engines ---
  const pathFinder = useMemo(() => new PathFinder(GRID_SIZE, GRID_SIZE), []);
  const riskModel = useMemo(() => new ProbabilityModel(GRID_SIZE), []);

  // --- Grid & Mission States ---
  const [vehiclePos, setVehiclePos] = useState({ x: 0, y: 0 });
  const [missionPlan, setMissionPlan] = useState([{ x: 14, y: 14 }]);
  const [obstacles, setObstacles] = useState(new Set(db.getScenarios()[0]?.obstacles || []));
  const [riskMap, setRiskMap] = useState({});
  const [showRiskMap, setShowRiskMap] = useState(false);
  const [selectionMode, setSelectionMode] = useState('WAYPOINT'); // 'WAYPOINT', 'OBSTACLE'

  // --- Simulation States ---
  const [isSimulating, setIsSimulating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoIncident, setAutoIncident] = useState(false);
  const [vehicleState, setVehicleState] = useState('IDLE');
  const [lastDecision, setLastDecision] = useState('System ready for deployment');
  const [currentTripId, setCurrentTripId] = useState(null);

  // --- Persistence & UI ---
  const [logs, setLogs] = useState(db.getHistory().logs);
  const [history, setHistory] = useState(db.getHistory());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [scenarios, setScenarios] = useState(db.getScenarios());
  const [scenarioNameInput, setScenarioNameInput] = useState("");
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [telemetry, setTelemetry] = useState({ speed: 0, distance: 0, confidence: 100 });

  // --- Refs ---
  const activePathRef = useRef([]);
  const pathIndexRef = useRef(0);

  // --- Initialization ---
  useEffect(() => {
    updateRiskMap(obstacles);
  }, [obstacles]);

  const updateRiskMap = useCallback((currentObstacles) => {
    const newMap = {};
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        newMap[`${x},${y}`] = riskModel.calculateRisk(currentObstacles, { x, y });
      }
    }
    setRiskMap(newMap);
  }, [riskModel]);

  // --- Database Sync ---
  const addLog = (msg, type = 'INFO') => {
    const entry = db.logEvent(msg, type);
    setLogs(prev => [entry, ...prev.slice(0, 49)]);
  };

  const addIncident = (type, msg) => {
    db.logIncident(currentTripId, type, msg);
    addLog(`INCIDENT [${type}]: ${msg}`, 'DANGER');
    setHistory(db.getHistory());
  };

  const calculatePath = useCallback((start, target, currentObstacles) => {
    const newPath = pathFinder.findPath(start, target, currentObstacles);
    return newPath;
  }, [pathFinder]);

  // --- Auto-Incident Engine ---
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
      addLog(`RADAR: Unexpected hazard at [${x},${y}]`, 'WARNING');
    }
  };

  // --- Simulation Cycle ---
  useEffect(() => {
    if (!isSimulating || isPaused) return;

    const tick = setInterval(() => {
      if (pathIndexRef.current >= activePathRef.current.length) {
        // Waypoint Logic
        if (missionPlan.length > 1) {
          const nextPlan = [...missionPlan];
          nextPlan.shift();
          setMissionPlan(nextPlan);
          addLog(`Waypoint reached. Engaging next vector...`, 'SUCCESS');
          const nextPath = calculatePath(vehiclePos, nextPlan[0], obstacles);
          activePathRef.current = nextPath;
          pathIndexRef.current = 0;
        } else {
          setIsSimulating(false);
          setVehicleState('STOPPED');
          db.endTrip(currentTripId, telemetry.distance, 'SUCCESS');
          setHistory(db.getHistory());
          addLog("Mission Analysis Complete.", "SUCCESS");
        }
        return;
      }

      const nextNode = activePathRef.current[pathIndexRef.current];
      
      // Safety Assessment
      const sensorDist = obstacles.has(`${nextNode.x},${nextNode.y}`) ? 0.5 : 1.5;
      const action = SafetyLogic.evaluate(sensorDist, telemetry.speed);
      setLastDecision(SafetyLogic.getXAIExplanation(action));

      if (action === SafetyLogic.Action.EMERGENCY_STOP || obstacles.has(`${nextNode.x},${nextNode.y}`)) {
        setVehicleState('REROUTING');
        const rPath = calculatePath(vehiclePos, missionPlan[0], obstacles);
        if (rPath.length > 0) {
          activePathRef.current = rPath;
          pathIndexRef.current = 0;
          addIncident('OBSTACLE', 'Obstacle detected. Rerouting...');
        } else {
          setIsSimulating(false);
          setVehicleState('STOPPED');
          addIncident('TRAPPED', 'All paths blocked. Shutdown.');
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

  // --- Controllers ---
  const handleStartContinue = () => {
    if (isPaused) {
      setIsPaused(false);
      setVehicleState('MOVING');
      addLog("Mission sequence resumed.");
      return;
    }

    // Always start a trip record to ensure persistence of every attempt
    const missionName = scenarioNameInput || scenarios[selectedScenarioIdx]?.name || "Custom Grid";
    const trip = db.startTrip(`${missionPlan.length} stops`, missionName);
    setCurrentTripId(trip.id);

    const launchPath = calculatePath(vehiclePos, missionPlan[0], obstacles);
    if (launchPath.length > 0) {
      activePathRef.current = launchPath;
      pathIndexRef.current = 0;
      setIsSimulating(true);
      setIsPaused(false);
      setVehicleState('MOVING');
      addLog(`Initiating trip #${trip.id.toString().slice(-4)}`);
    } else {
      setLastDecision("Target unreachable!");
      db.endTrip(trip.id, 0, 'FAILED_PATH');
      setHistory(db.getHistory());
      addLog("Mission sequence failed: No path found.", "DANGER");
    }
  };

  const handlePause = () => {
    if (!isSimulating) return;
    setIsPaused(true);
    setVehicleState('PAUSED');
    addLog("Mission sequence suspended.");
  };

  const handleAbort = () => {
    setIsSimulating(false);
    setIsPaused(false);
    setVehicleState('STOPPED');
    if (currentTripId) {
      db.endTrip(currentTripId, telemetry.distance, 'ABORTED');
      setHistory(db.getHistory());
      addLog("Mission sequence aborted.", "WARNING");
    }
  };

  const saveScenario = () => {
    const name = scenarioNameInput.trim();
    if (!name) { alert("Please enter a scenario name."); return; }
    db.saveScenario(name, obstacles, missionPlan);
    setScenarios([...db.getScenarios()]);
    addLog(`Map configuration saved as '${name}'`);
  };

  const deleteScenario = () => {
    const nameToDelete = scenarioNameInput.trim() || scenarios[selectedScenarioIdx]?.name;
    if (!nameToDelete) {
      alert("No scenario selected to delete.");
      return;
    }
    // Show custom tactical confirmation instead of native window.confirm
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
    addLog(`Scenario '${nameToDelete}' purged from memory.`, "WARNING");
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
    addLog(`Config loaded: ${s.name}`);
  };

  const exportToMarkdown = () => {
    const data = db.getHistory();
    let md = `# AEGIS-CORE MISSION REPORT\n\n`;
    md += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    md += `## TRIP ARCHIVE\n\n| ID | SCENARIO | TIME | DISTANCE | STATUS |\n|---|---|---|---|---|\n`;
    data.trips.forEach(t => {
      md += `| #${t.id.toString().slice(-4)} | ${t.scenarioName} | ${new Date(t.startTime).toLocaleTimeString()} | ${t.distance}U | ${t.status} |\n`;
    });

    md += `\n## INCIDENT LOGS\n\n`;
    if (data.incidents.length === 0) md += `*No incidents recorded.*\n`;
    else data.incidents.forEach(inc => {
      md += `- **${inc.type}**: ${inc.msg} (Trip ID: ${inc.tripId.toString().slice(-4)})\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AEGIS_MISSION_REPORT_${Date.now()}.md`;
    link.click();
    addLog("Mission report exported to Markdown.");
  };

  return (
    <div className="app-container tactical-bg">
      <header className="main-header glass-panel">
        <div className="title-group">
          <h1 className="neon">AEGIS-CORE <span className="term-text">COMMAND SYSTEM</span></h1>
          <p className="term-text" style={{letterSpacing: '5px'}}>LOGISTICS & AUTONOMY v4.6</p>
        </div>
        <div className="state-monitor">
          <div className="monitor-value" data-state={vehicleState}>{vehicleState}</div>
          <div className="term-text">SYSTEM STATUS</div>
        </div>
      </header>

      <div className="main-content">
        <aside className="side-panel left glass-panel">
          <div className="telemetry-block">
            <h3>QUANTUM STATUS</h3>
            <div className="tactical-gauge">
              <div className="gauge-label">VELOCITY (KM/H)</div>
              <div className="gauge-value cyan">{telemetry.speed}</div>
            </div>
            <div className="tactical-gauge">
              <div className="gauge-label">TOTAL DISTANCE</div>
              <div className="gauge-value">{telemetry.distance.toFixed(1)}U</div>
            </div>
          </div>

          <div className="xai-block">
            <h3>AI LOGIC FEED (XAI)</h3>
            <div className="logic-output">
               <span className="cursor">{">"}</span> {lastDecision}
            </div>
          </div>

          <div className="scenarios-block">
             <h3>SCENARIO MANAGER</h3>
             <div className="scenario-controls">
                <input 
                  className="tactical-input" 
                  placeholder="SCENARIO NAME..." 
                  value={scenarioNameInput} 
                  onChange={e => setScenarioNameInput(e.target.value)} 
                />
                <div className="save-row">
                  <button onClick={saveScenario} className="mini-btn" style={{flex: 1}}>SAVE MAP</button>
                  <button onClick={deleteScenario} className="mini-btn danger" style={{flex: 1}}>DELETE MAP</button>
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
                ADD TARGET
              </button>
              <button className={`mode-toggle ${selectionMode === 'OBSTACLE' ? 'active' : ''}`} data-mode="OBSTACLE" onClick={() => setSelectionMode('OBSTACLE')}>
                ADD HAZARD
              </button>
            </div>
            <button className={`mode-btn ${showRiskMap ? 'active' : ''}`} onClick={() => setShowRiskMap(!showRiskMap)}>
               RADAR SCAN {showRiskMap ? 'ACTIVE' : 'OFF'}
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
             <h3>SYSTEM LOGS</h3>
             <div className="log-scroll">
                {logs.map((l, i) => (
                  <div key={i} className="log-row">
                    <span className="log-time">[{l.time.split('T')[1].split('.')[0]}]</span> {l.msg}
                  </div>
                ))}
             </div>
          </div>
          <button className="tact-btn action" onClick={() => {setHistory(db.getHistory()); setShowAnalytics(true)}}>VIEW ANALYTICS</button>
        </aside>
      </div>

      <footer className="tactical-footer glass-panel">
        <button className="tact-btn action" onClick={handleStartContinue} disabled={isSimulating && !isPaused}>START/RESUME</button>
        <button className="tact-btn warning" onClick={handlePause} disabled={!isSimulating || isPaused}>PAUSE</button>
        <button className="tact-btn danger" onClick={handleAbort} disabled={!isSimulating && !isPaused}>STOP/ABORT</button>
        <button className="tact-btn neutral" onClick={() => { setVehiclePos({x:0,y:0}); setMissionPlan([{x:14,y:14}]); setTelemetry({speed:0,distance:0,confidence:100}); setObstacles(new Set()); addLog("System Reset."); }}>RESET</button>
        <button className="tact-btn" onClick={handleRandomIncident}>CHAOS INJECT</button>
      </footer>

      {showConfirmDelete && (
        <div className="modal-overlay" onClick={() => setShowConfirmDelete(false)}>
          <div className="confirm-modal glass-panel" onClick={e => e.stopPropagation()}>
            <h2 className="neon" style={{fontSize: '1.2rem', marginBottom: '15px'}}>AUTHENTICATION REQUIRED</h2>
            <p className="term-text" style={{fontSize: '0.8rem', color: '#fff', marginBottom: '20px'}}>
              PERMANENTLY PURGE DATA: <span style={{color: 'var(--red-critical)'}}>{scenarioNameInput.trim() || scenarios[selectedScenarioIdx]?.name}</span>?
              THERE IS NO RECOVERING THIS SECTOR ONCE WIPED.
            </p>
            <div className="save-row" style={{gap: '15px'}}>
               <button className="tact-btn danger" style={{padding: '10px 20px', flex: 1}} onClick={confirmDeleteScenario}>CONFIRM PURGE</button>
               <button className="tact-btn" style={{padding: '10px 20px', flex: 1}} onClick={() => setShowConfirmDelete(false)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {showAnalytics && (
        <div className="modal-overlay" onClick={() => setShowAnalytics(false)}>
           <div className="analytics-modal glass-panel" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h2 className="neon">MISSION HISTORY DATA</h2>
                 <div style={{display: 'flex', gap: '10px'}}>
                   <button className="tact-btn action" style={{padding: '5px 15px', fontSize: '0.6rem'}} onClick={exportToMarkdown}>EXPORT .MD</button>
                   <button className="close-btn" onClick={() => setShowAnalytics(false)}>CLOSE</button>
                 </div>
              </div>
              <div className="history-grid">
                 <div className="table-container">
                    <table>
                      <thead>
                        <tr><th>ID</th><th>SCENARIO</th><th>TIME</th><th>DIST</th><th>STATUS</th></tr>
                      </thead>
                      <tbody>
                        {history.trips.map(t => (
                          <tr key={t.id}>
                            <td>#{t.id.toString().slice(-4)}</td>
                            <td>{t.scenarioName}</td>
                            <td>{new Date(t.startTime).toLocaleTimeString()}</td>
                            <td>{t.distance}U</td>
                            <td className={t.status === 'SUCCESS' ? 'green' : (t.status?.includes('FAILED') ? 'red' : 'cyan')}>{t.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
                 <div className="incident-box">
                    <h3>INCIDENT REPORT</h3>
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
