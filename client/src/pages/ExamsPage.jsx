import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ExamsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/exams').then(r => setExams(r.data)).finally(() => setLoading(false));
  }, []);

  const startExam = async (examId) => {
    try {
      const { data } = await axios.post('/api/sessions/start', { examId });
      navigate(`/exam/${examId}/room?session=${data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not start exam');
    }
  };

  const activate = async (examId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    const { data } = await axios.put(`/api/exams/${examId}`, { status: newStatus });
    setExams(ex => ex.map(e => e._id === examId ? { ...e, status: data.status } : e));
  };

  if (loading) return <div style={{ color: 'var(--text-muted)' }}>Loading exams…</div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Exams</h1>
          <p>{user.role === 'student' ? 'Available exams to take' : 'Manage your exams'}</p>
        </div>
        {(user.role === 'instructor' || user.role === 'admin') && (
          <button className="btn btn-primary" onClick={() => navigate('/exams/create')}>
            + Create Exam
          </button>
        )}
      </div>

      {exams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No exams yet</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {user.role === 'student' ? 'No active exams available.' : 'Create your first exam to get started.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {exams.map(exam => (
            <div key={exam._id} className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{exam.title}</span>
                  <span className={`badge badge-${exam.status === 'active' ? 'low' : 'medium'}`}>{exam.status}</span>
                </div>
                {exam.description && <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>{exam.description}</div>}
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>⏱ {exam.duration} min</span>
                  <span>◈ {exam.questions?.length || 0} questions</span>
                  {exam.instructor && <span>by {exam.instructor.name}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {user.role === 'student' && exam.status === 'active' && (
                  <button className="btn btn-primary" onClick={() => startExam(exam._id)}>
                    Start Exam
                  </button>
                )}
                {(user.role === 'instructor' || user.role === 'admin') && (
                  <>
                    <button className="btn btn-ghost" onClick={() => navigate(`/monitor/${exam._id}`)}>
                      Monitor
                    </button>
                    <button className="btn btn-ghost" onClick={() => activate(exam._id, exam.status)}>
                      {exam.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
