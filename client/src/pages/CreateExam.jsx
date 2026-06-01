import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const emptyQuestion = () => ({ text: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: '', marks: 1 });

export default function CreateExam() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', duration: 60, status: 'draft',
    questions: [emptyQuestion()],
    anomalyThresholds: { tabSwitchWarnings: 3, copyPasteWarnings: 2, suspiciousScore: 70 },
  });
  const [saving, setSaving] = useState(false);

  const handleField = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleQuestion = (idx, field, value) => {
    const qs = [...form.questions];
    qs[idx] = { ...qs[idx], [field]: value };
    setForm(f => ({ ...f, questions: qs }));
  };

  const handleOption = (qi, oi, value) => {
    const qs = [...form.questions];
    const opts = [...qs[qi].options];
    opts[oi] = value;
    qs[qi] = { ...qs[qi], options: opts };
    setForm(f => ({ ...f, questions: qs }));
  };

  const addQuestion = () => setForm(f => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  const removeQuestion = (idx) => setForm(f => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.post('/api/exams', form);
      navigate('/exams');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create exam');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1>Create Exam</h1>
        <p>Configure your exam and add questions</p>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Basic info */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 20, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Exam Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="label">Title</div>
              <input className="input" value={form.title} onChange={e => handleField('title', e.target.value)} placeholder="e.g. Midterm Examination — CS101" required />
            </div>
            <div>
              <div className="label">Description</div>
              <textarea className="input" value={form.description} onChange={e => handleField('description', e.target.value)} placeholder="Brief description for students…" rows={2} style={{ resize: 'vertical' }} />
            </div>
            <div className="grid-2">
              <div>
                <div className="label">Duration (minutes)</div>
                <input type="number" className="input" value={form.duration} onChange={e => handleField('duration', Number(e.target.value))} min={5} max={480} required />
              </div>
              <div>
                <div className="label">Status</div>
                <select className="input" value={form.status} onChange={e => handleField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Anomaly thresholds */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 20, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Anomaly Thresholds
          </div>
          <div className="grid-3">
            <div>
              <div className="label">Tab Switch Warnings</div>
              <input type="number" className="input" value={form.anomalyThresholds.tabSwitchWarnings}
                onChange={e => setForm(f => ({ ...f, anomalyThresholds: { ...f.anomalyThresholds, tabSwitchWarnings: Number(e.target.value) } }))}
                min={1} max={10} />
            </div>
            <div>
              <div className="label">Copy/Paste Warnings</div>
              <input type="number" className="input" value={form.anomalyThresholds.copyPasteWarnings}
                onChange={e => setForm(f => ({ ...f, anomalyThresholds: { ...f.anomalyThresholds, copyPasteWarnings: Number(e.target.value) } }))}
                min={1} max={10} />
            </div>
            <div>
              <div className="label">Flag Score Threshold (%)</div>
              <input type="number" className="input" value={form.anomalyThresholds.suspiciousScore}
                onChange={e => setForm(f => ({ ...f, anomalyThresholds: { ...f.anomalyThresholds, suspiciousScore: Number(e.target.value) } }))}
                min={10} max={100} />
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 20, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Questions ({form.questions.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {form.questions.map((q, qi) => (
              <div key={qi} style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: 18, border: '1px solid var(--border)' }}>
                <div className="flex-between" style={{ marginBottom: 14 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>Q{qi + 1}</span>
                  {form.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)} style={{ background: 'none', color: 'var(--red)', fontSize: 18, cursor: 'pointer' }}>×</button>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="input" placeholder="Question text…" value={q.text} onChange={e => handleQuestion(qi, 'text', e.target.value)} required />
                  <div className="grid-2">
                    <select className="input" value={q.type} onChange={e => handleQuestion(qi, 'type', e.target.value)}>
                      <option value="mcq">Multiple Choice</option>
                      <option value="short">Short Answer</option>
                      <option value="long">Long Answer</option>
                    </select>
                    <input type="number" className="input" placeholder="Marks" value={q.marks} onChange={e => handleQuestion(qi, 'marks', Number(e.target.value))} min={1} />
                  </div>
                  {q.type === 'mcq' && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {q.options.map((opt, oi) => (
                          <input key={oi} className="input" placeholder={`Option ${oi + 1}`} value={opt}
                            onChange={e => handleOption(qi, oi, e.target.value)}
                            style={{ borderColor: q.correctAnswer === opt && opt ? 'var(--green)' : undefined }}
                          />
                        ))}
                      </div>
                      <select className="input" value={q.correctAnswer} onChange={e => handleQuestion(qi, 'correctAnswer', e.target.value)}>
                        <option value="">— Select correct answer —</option>
                        {q.options.filter(o => o).map((o, i) => <option key={i} value={o}>{o}</option>)}
                      </select>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addQuestion} className="btn btn-ghost" style={{ marginTop: 16 }}>
            + Add Question
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/exams')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
}
