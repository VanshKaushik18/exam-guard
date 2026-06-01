import { useState, useEffect } from 'react';
import { generateSessionPDF } from '../utils/generatePDF';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const riskColors = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };
const eventLabels = {
  tab_switch: 'Tab Switch', copy_attempt: 'Copy Attempt', paste_attempt: 'Paste Attempt',
  window_blur: 'Window Blur', dev_tools_attempt: '🚨 Dev Tools', right_click: 'Right Click',
  keyboard_shortcut: 'Keyboard Shortcut', fullscreen_exit: 'Fullscreen Exit', idle_detected: 'Idle Period',
  window_focus: 'Window Focus', answer_changed: 'Answer Changed',
};
const severityColors = { low: 'var(--text-muted)', medium: 'var(--yellow)', high: 'var(--red)' };

export default function SessionReview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/sessions/${sessionId}`)
      .then(r => setSession(r.data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading session…</div>;
  if (!session) return <div style={{ color: 'var(--red)' }}>Session not found.</div>;

  const risk = session.riskLevel;
  const riskColor = riskColors[risk];

  // Build timeline data: score over time
  const timelineData = [];
  let runningScore = 0;
  const scoreMap = { tab_switch: 10, copy_attempt: 15, paste_attempt: 15, dev_tools_attempt: 20, window_blur: 8, fullscreen_exit: 12, idle_detected: 5, keyboard_shortcut: 5, right_click: 3 };
  session.behavioralEvents.forEach((ev, i) => {
    runningScore = Math.min(runningScore + (scoreMap[ev.type] || 0), 100);
    if (i % 3 === 0 || i === session.behavioralEvents.length - 1) {
      timelineData.push({ time: i, score: runningScore, event: ev.type });
    }
  });

  const statItems = [
    { label: 'Tab Switches', value: session.stats.tabSwitches, color: 'var(--orange)' },
    { label: 'Copy Attempts', value: session.stats.copyAttempts, color: 'var(--red)' },
    { label: 'Paste Attempts', value: session.stats.pasteAttempts, color: 'var(--red)' },
    { label: 'Window Blurs', value: session.stats.windowBlurs, color: 'var(--yellow)' },
    { label: 'Dev Tools', value: session.stats.devToolsAttempts, color: 'var(--red)' },
    { label: 'Idle Periods', value: session.stats.idlePeriods, color: 'var(--yellow)' },
    { label: 'Right Clicks', value: session.stats.rightClicks, color: 'var(--text-muted)' },
    { label: 'Fullscreen Exits', value: session.stats.fullscreenExits, color: 'var(--orange)' },
  ];

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="flex-between" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ fontSize: 13 }}>← Back</button>
          <button className="btn btn-ghost" onClick={() => generateSessionPDF(session)} style={{ fontSize: 13, color: 'var(--accent)', borderColor: 'rgba(0,212,255,0.3)' }}>
            ⬇ Export PDF
          </button>
        </div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Session Review</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            {session.student?.name} · {session.exam?.title}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${riskColor}`, color: riskColor,
            fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 700,
            background: `rgba(${risk === 'critical' ? '255,71,87' : risk === 'high' ? '255,159,67' : '0,229,160'},0.08)`,
            animation: risk === 'critical' ? 'pulse 2s infinite' : 'none',
          }}>
            {session.anomalyScore}
          </div>
          <div style={{ marginTop: 8 }}>
            <span className={`badge badge-${risk}`}>{risk} risk</span>
          </div>
          {session.flagged && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
              🚩 FLAGGED
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {statItems.map(item => (
          <div key={item.label} className="card" style={{ padding: 16 }}>
            <div className="label" style={{ fontSize: 10 }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: item.value > 0 ? item.color : 'var(--text-dim)' }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Score timeline */}
      {timelineData.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label" style={{ marginBottom: 16 }}>Anomaly Score Timeline</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis hide />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                formatter={(val) => [`${val}%`, 'Anomaly Score']}
              />
              <Area type="monotone" dataKey="score" stroke={riskColor} fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Event log */}
      <div className="card">
        <div className="label" style={{ marginBottom: 16 }}>
          Event Log ({session.behavioralEvents.length} events)
        </div>
        {session.behavioralEvents.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No behavioral events recorded.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {[...session.behavioralEvents].reverse().map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8,
                borderLeft: `3px solid ${severityColors[ev.severity] || 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    color: severityColors[ev.severity], fontWeight: 700, padding: '2px 8px',
                    background: 'rgba(255,255,255,0.05)', borderRadius: 4,
                  }}>
                    {ev.severity}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{eventLabels[ev.type] || ev.type}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(ev.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(255,71,87,0.4); } 50% { box-shadow: 0 0 0 12px transparent; } }`}</style>
    </div>
  );
}
