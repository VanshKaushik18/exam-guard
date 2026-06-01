import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const StatCard = ({ label, value, sub, accent }) => (
  <div className="card" style={{ borderColor: accent ? 'rgba(0,212,255,0.2)' : 'var(--border)' }}>
    <div className="label">{label}</div>
    <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'var(--font-mono)', color: accent || 'var(--text)', lineHeight: 1.1, marginTop: 4 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
  </div>
);

const riskColors = { low: '#00e5a0', medium: '#ffd166', high: '#ff9f43', critical: '#ff4757' };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === 'instructor' || user.role === 'admin') {
          const [statsRes, examsRes] = await Promise.all([
            axios.get('/api/analytics/dashboard'),
            axios.get('/api/exams'),
          ]);
          setStats(statsRes.data);
          setRecentExams(examsRes.data.slice(0, 5));
        } else {
          const examsRes = await axios.get('/api/exams');
          setRecentExams(examsRes.data.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading) return <div style={{ color: 'var(--text-muted)', padding: 40 }}>Loading dashboard…</div>;

  const eventData = stats?.eventTypeCounts
    ? Object.entries(stats.eventTypeCounts).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
      })).sort((a, b) => b.value - a.value).slice(0, 6)
    : [];

  const riskData = stats?.riskBreakdown
    ? Object.entries(stats.riskBreakdown).map(([level, count]) => ({
        level: level.charAt(0).toUpperCase() + level.slice(1),
        count,
        color: riskColors[level],
      }))
    : [];

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.name.split(' ')[0]} 👋</h1>
        <p>{user.role === 'student' ? 'Your upcoming exams and performance overview' : 'Behavioral analytics and exam integrity overview'}</p>
      </div>

      {/* Instructor stats */}
      {stats && (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <StatCard label="Total Exams" value={stats.totalExams} sub="Created by you" accent="var(--accent)" />
            <StatCard label="Total Sessions" value={stats.totalSessions} sub="Exam attempts" />
            <StatCard label="Flagged" value={stats.flaggedSessions} sub="Require review" accent={stats.flaggedSessions > 0 ? 'var(--red)' : undefined} />
            <StatCard label="Avg Risk Score" value={`${stats.avgAnomalyScore}%`} sub="Across all sessions" accent={stats.avgAnomalyScore > 50 ? 'var(--orange)' : undefined} />
          </div>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            {/* Risk breakdown */}
            <div className="card">
              <div className="label" style={{ marginBottom: 16 }}>Risk Level Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={riskData}>
                  <XAxis dataKey="level" stroke="var(--text-muted)" tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                  <YAxis stroke="var(--text-muted)" tick={{ fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Event radar */}
            {eventData.length > 0 && (
              <div className="card">
                <div className="label" style={{ marginBottom: 16 }}>Anomaly Event Frequency</div>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={eventData}>
                    <PolarGrid stroke="var(--border)" />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }} />
                    <Radar dataKey="value" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recent exams */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 20 }}>
          <div className="label">Recent Exams</div>
          <button onClick={() => navigate('/exams')} className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: 12 }}>
            View all →
          </button>
        </div>
        {recentExams.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontSize: 14 }}>
            No exams yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentExams.map(exam => (
              <div key={exam._id} onClick={() => navigate('/exams')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', background: 'var(--bg-elevated)',
                  borderRadius: 8, cursor: 'pointer', border: '1px solid transparent',
                  transition: 'border-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{exam.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {exam.questions?.length || 0} questions · {exam.duration} min
                  </div>
                </div>
                <span className={`badge badge-${exam.status === 'active' ? 'low' : 'medium'}`}>
                  {exam.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
