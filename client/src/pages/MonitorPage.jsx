import { useState, useEffect } from 'react';
import { generateSessionPDF } from '../utils/generatePDF';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const riskColors = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };
const riskBg = { low: 'var(--green-dim)', medium: 'var(--yellow-dim)', high: 'var(--orange-dim)', critical: 'var(--red-dim)' };

const eventLabels = {
  tab_switch: 'Tab Switch', copy_attempt: 'Copy', paste_attempt: 'Paste',
  window_blur: 'Window Blur', dev_tools_attempt: 'Dev Tools', right_click: 'Right Click',
  keyboard_shortcut: 'Shortcut', fullscreen_exit: 'Fullscreen Exit', idle_detected: 'Idle',
};

const eventSeverityColors = {
  low: 'var(--text-muted)', medium: 'var(--yellow)', high: 'var(--red)',
};

export default function MonitorPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [liveUpdates, setLiveUpdates] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      const [examRes, sessionsRes] = await Promise.all([
        axios.get(`/api/exams/${examId}`),
        axios.get(`/api/sessions/exam/${examId}`),
      ]);
      setExam(examRes.data);
      setSessions(sessionsRes.data);
    };
    load();

    // Socket for real-time updates
    const socket = io(window.location.origin);
    socket.emit('join-instructor', examId);
    socket.on('anomaly-update', (data) => {
      setLiveUpdates(prev => ({
        ...prev,
        [data.sessionId]: {
          ...prev[data.sessionId],
          anomalyScore: data.anomalyScore,
          riskLevel: data.riskLevel,
          stats: data.stats,
          lastEvent: data.event,
          lastEventTime: new Date(),
        },
      }));
    });

    return () => socket.disconnect();
  }, [examId]);

  const sorted = [...sessions].sort((a, b) => {
    const aScore = liveUpdates[a._id]?.anomalyScore ?? a.anomalyScore;
    const bScore = liveUpdates[b._id]?.anomalyScore ?? b.anomalyScore;
    return bScore - aScore;
  });

  const selectedSession = selected ? sessions.find(s => s._id === selected) : null;
  const liveData = selected ? liveUpdates[selected] : null;

  if (!exam) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
            Live Monitor
          </div>
          <h1>{exam.title}</h1>
          <p>{sessions.length} active session{sessions.length !== 1 ? 's' : ''} · updates in real-time</p>
        </div>
        <div style={{ display: 'flex', align: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100, background: 'var(--green-dim)', border: '1px solid rgba(0,229,160,0.3)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-red 2s infinite' }} />
            <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>LIVE</span>
          </div>
          <button className="btn btn-ghost" onClick={() => navigate('/exams')}>← Back</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Session grid */}
        <div>
          {sorted.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              No students have started this exam yet.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {sorted.map(s => {
                const live = liveUpdates[s._id] || {};
                const score = live.anomalyScore ?? s.anomalyScore;
                const risk = live.riskLevel ?? s.riskLevel;
                const stats = live.stats ?? s.stats;
                const isSelected = selected === s._id;

                return (
                  <div key={s._id} onClick={() => setSelected(isSelected ? null : s._id)}
                    style={{
                      background: 'var(--bg-card)', borderRadius: 12, padding: 18, cursor: 'pointer',
                      border: `1px solid ${isSelected ? riskColors[risk] : risk === 'critical' ? 'rgba(255,71,87,0.3)' : 'var(--border)'}`,
                      transition: 'all 0.2s',
                      boxShadow: risk === 'critical' ? '0 0 20px rgba(255,71,87,0.1)' : 'none',
                    }}>
                    <div className="flex-between" style={{ marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{s.student?.name || 'Unknown'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.student?.email}</div>
                      </div>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${riskColors[risk]}`,
                        color: riskColors[risk], fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                        animation: risk === 'critical' ? 'pulse-red 1.5s infinite' : 'none',
                      }}>
                        {score}
                      </div>
                    </div>

                    <span className={`badge badge-${risk}`} style={{ marginBottom: 12 }}>{risk}</span>

                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 12 }}>
                      {[
                        ['Tabs', stats?.tabSwitches || 0],
                        ['Copy', stats?.copyAttempts || 0],
                        ['DevTools', stats?.devToolsAttempts || 0],
                      ].map(([label, val]) => (
                        <div key={label} style={{ textAlign: 'center', background: 'var(--bg-elevated)', borderRadius: 6, padding: '6px 0' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: val > 0 ? 'var(--red)' : 'var(--text-muted)' }}>{val}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {live.lastEvent && (
                      <div style={{ marginTop: 10, fontSize: 11, color: eventSeverityColors[live.lastEvent.severity], fontFamily: 'var(--font-mono)' }}>
                        ↳ {eventLabels[live.lastEvent.type] || live.lastEvent.type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && selectedSession && (
          <div className="card" style={{ position: 'sticky', top: 20, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
            <div className="flex-between" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700 }}>{selectedSession.student?.name}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                onClick={() => navigate(`/sessions/${selected}`)}>
                Full Session Review →
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--accent)' }}
                onClick={() => generateSessionPDF(selectedSession)}>
                ⬇ PDF
              </button>
            </div>

            <div className="label" style={{ marginBottom: 10 }}>Event Log</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...selectedSession.behavioralEvents].reverse().slice(0, 30).map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', background: 'var(--bg-elevated)', borderRadius: 6,
                  borderLeft: `3px solid ${eventSeverityColors[ev.severity] || 'var(--border)'}`,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600 }}>
                    {eventLabels[ev.type] || ev.type}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(ev.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {selectedSession.behavioralEvents.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>No events yet</div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes pulse-red { 0%,100% { box-shadow: 0 0 0 0 rgba(255,71,87,0.4); } 50% { box-shadow: 0 0 0 8px transparent; } }`}</style>
    </div>
  );
}
