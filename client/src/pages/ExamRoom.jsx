import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useBehavioralTracker } from '../hooks/useBehavioralTracker';

const WARNING_MSGS = {
  tab_switch: '⚠ Tab switch detected',
  copy_attempt: '⚠ Copy attempt detected',
  paste_attempt: '⚠ Paste blocked',
  window_blur: '⚠ Window focus lost',
  dev_tools_attempt: '🚨 Developer tools detected',
  right_click: 'Right-click disabled',
  keyboard_shortcut: '⚠ Keyboard shortcut detected',
  fullscreen_exit: '⚠ Please stay in fullscreen',
  idle_detected: '⚠ Inactivity detected',
};

export default function ExamRoom() {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [exam, setExam] = useState(null);
  const [session, setSession] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [anomalyScore, setAnomalyScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('low');
  const [warnings, setWarnings] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const questionStartTime = useRef(Date.now());

  const addWarning = useCallback((msg) => {
    const id = Date.now();
    setWarnings(w => [{ id, msg }, ...w].slice(0, 5));
    setTimeout(() => setWarnings(w => w.filter(x => x.id !== id)), 4000);
  }, []);

  // Custom log handler to show warnings in UI
  const customLog = useCallback(async (type, metadata = {}, severity = 'low') => {
    if (WARNING_MSGS[type]) addWarning(WARNING_MSGS[type]);
    if (!sessionId) return;
    try {
      const { data } = await axios.post(`/api/sessions/${sessionId}/event`, { type, metadata, severity });
      setAnomalyScore(data.anomalyScore);
      setRiskLevel(data.riskLevel);
    } catch {}
  }, [sessionId, addWarning]);

  const { requestFullscreen } = useBehavioralTracker(sessionId, true);

  // Override default log with UI-aware version
  useEffect(() => {
    if (!sessionId) return;
    const handleVis = () => {
      if (document.hidden) customLog('tab_switch', {}, 'high');
    };
    const handleBlur = () => customLog('window_blur', {}, 'medium');
    const handleCtxMenu = (e) => { e.preventDefault(); customLog('right_click', {}, 'low'); };
    const handlePaste = (e) => { e.preventDefault(); customLog('paste_attempt', {}, 'high'); };
    const handleKey = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'F12' || (ctrl && e.shiftKey && ['I', 'J'].includes(e.key))) {
        e.preventDefault(); customLog('dev_tools_attempt', {}, 'high');
      }
      if (ctrl && e.key.toLowerCase() === 'v') { e.preventDefault(); customLog('paste_attempt', {}, 'high'); }
      if (ctrl && ['c', 'x'].includes(e.key.toLowerCase())) customLog('copy_attempt', {}, 'high');
    };
    const handleFs = () => { if (!document.fullscreenElement) customLog('fullscreen_exit', {}, 'medium'); };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleCtxMenu);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('fullscreenchange', handleFs);

    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleCtxMenu);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('fullscreenchange', handleFs);
    };
  }, [customLog, sessionId]);

  useEffect(() => {
    const load = async () => {
      const [examRes, sessionRes] = await Promise.all([
        axios.get(`/api/exams/${examId}`),
        sessionId ? axios.get(`/api/sessions/${sessionId}`) : Promise.resolve({ data: null }),
      ]);
      setExam(examRes.data);
      setSession(sessionRes.data);
      setTimeLeft(examRes.data.duration * 60);
    };
    load();
    requestFullscreen();
  }, [examId, sessionId]);

  // Countdown timer
  useEffect(() => {
    if (!timeLeft || submitted) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(t); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitted]);

  const saveAnswer = async (questionId, answer) => {
    setAnswers(a => ({ ...a, [questionId]: answer }));
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
    if (sessionId) {
      await axios.post(`/api/sessions/${sessionId}/answer`, { questionId, answer, timeSpent }).catch(() => {});
    }
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    setSubmitting(true);
    try {
      if (sessionId) await axios.post(`/api/sessions/${sessionId}/submit`);
      setSubmitted(true);
    } catch {}
    setSubmitting(false);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!exam) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--text-muted)' }}>Loading exam…</div>;

  const riskColors = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };
  const riskColor = riskColors[riskLevel] || 'var(--green)';
  const isUrgent = timeLeft && timeLeft < 300;

  if (submitted) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 60 }}>✓</div>
        <h2 style={{ fontSize: 28, fontWeight: 800 }}>Exam Submitted</h2>
        <p style={{ color: 'var(--text-muted)' }}>Your responses have been recorded.</p>
        {anomalyScore > 50 && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,71,87,0.3)', borderRadius: 10, padding: '14px 20px', fontSize: 14, color: 'var(--red)', maxWidth: 400, textAlign: 'center' }}>
            Your session was flagged for review due to detected anomalies.
          </div>
        )}
        <button className="btn btn-primary" onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  const q = exam.questions[currentQ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Top bar */}
      <header style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>{exam.title}</div>

        {/* Anomaly indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 100, background: `rgba(${riskLevel === 'critical' ? '255,71,87' : riskLevel === 'high' ? '255,159,67' : riskLevel === 'medium' ? '255,209,102' : '0,229,160'},0.1)`, border: `1px solid ${riskColor}30` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: riskColor, animation: riskLevel !== 'low' ? 'pulse-red 1.5s infinite' : 'none' }} />
          <span style={{ fontSize: 12, color: riskColor, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            INTEGRITY {anomalyScore}%
          </span>
        </div>

        {/* Timer */}
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color: isUrgent ? 'var(--red)' : 'var(--text)' }}>
          {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
        </div>
      </header>

      {/* Warnings overlay */}
      <div style={{ position: 'fixed', top: 70, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {warnings.map(w => (
          <div key={w.id} style={{
            background: 'var(--red-dim)', border: '1px solid rgba(255,71,87,0.4)',
            borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--red)',
            fontWeight: 700, animation: 'slideIn 0.2s ease',
          }}>
            {w.msg}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 0 }}>
        {/* Question sidebar */}
        <aside style={{ width: 200, background: 'var(--bg-card)', borderRight: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
            Questions
          </div>
          {exam.questions.map((_, i) => (
            <button key={i} onClick={() => { setCurrentQ(i); questionStartTime.current = Date.now(); }}
              style={{
                padding: '8px 12px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-mono)', textAlign: 'left', cursor: 'pointer',
                background: i === currentQ ? 'var(--accent-dim)' : answers[exam.questions[i]._id] ? 'var(--green-dim)' : 'var(--bg-elevated)',
                color: i === currentQ ? 'var(--accent)' : answers[exam.questions[i]._id] ? 'var(--green)' : 'var(--text-muted)',
                border: `1px solid ${i === currentQ ? 'rgba(0,212,255,0.3)' : answers[exam.questions[i]._id] ? 'rgba(0,229,160,0.2)' : 'transparent'}`,
              }}>
              Q{i + 1}
            </button>
          ))}
        </aside>

        {/* Question area */}
        <main style={{ flex: 1, padding: 40, maxWidth: 720, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
              Question {currentQ + 1} of {exam.questions.length}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {q.marks} mark{q.marks !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, marginBottom: 32 }}>
            {q.text}
          </div>

          {q.type === 'mcq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {q.options.filter(o => o).map((opt, i) => {
                const selected = answers[q._id] === opt;
                return (
                  <button key={i} onClick={() => saveAnswer(q._id, opt)}
                    style={{
                      padding: '14px 18px', borderRadius: 10, fontSize: 15, fontWeight: 500,
                      textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s',
                      background: selected ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      color: selected ? 'var(--accent)' : 'var(--text)',
                      fontFamily: 'var(--font-display)',
                    }}>
                    <span style={{ fontFamily: 'var(--font-mono)', marginRight: 12, opacity: 0.6, fontSize: 13 }}>
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {(q.type === 'short' || q.type === 'long') && (
            <textarea
              className="input"
              value={answers[q._id] || ''}
              onChange={e => saveAnswer(q._id, e.target.value)}
              placeholder="Type your answer here…"
              rows={q.type === 'long' ? 10 : 3}
              style={{ resize: 'vertical', lineHeight: 1.7 }}
            />
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
            <button className="btn btn-ghost" onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}>
              ← Previous
            </button>
            {currentQ < exam.questions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => { setCurrentQ(q => q + 1); questionStartTime.current = Date.now(); }}>
                Next →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
                style={{ background: 'var(--green)', color: '#000' }}>
                {submitting ? 'Submitting…' : 'Submit Exam ✓'}
              </button>
            )}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
