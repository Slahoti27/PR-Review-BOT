import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createReview, getReviews } from '../api/client';

const StatusDot = ({ status }) => {
  const colors = { pending: 'var(--major)', completed: 'var(--minor)', failed: 'var(--critical)' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[status] || 'var(--muted)', marginRight: 6 }} />;
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [prUrl, setPrUrl] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await getReviews();
      setReviews(res.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReviews();
    // Poll every 5s for pending reviews
    const interval = setInterval(fetchReviews, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!prUrl.trim()) return;
    setSubmitting(true);
    try {
      await createReview(prUrl.trim());
      setPrUrl('');
      fetchReviews();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start review');
    } finally { setSubmitting(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={user?.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
          <div>
            <div style={{ fontWeight: 600 }}>{user?.displayName || user?.username}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>@{user?.username}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🤖</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>PR Review Bot</span>
          <button className="btn btn-ghost" onClick={handleLogout} style={{ marginLeft: 12 }}>Logout</button>
        </div>
      </div>

      {/* Submit form */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem' }}>New Review</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10 }}>
          <input
            type="url"
            placeholder="https://github.com/owner/repo/pull/123"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', color: 'var(--text)', fontSize: 14, outline: 'none' }}
          />
          <button className="btn btn-primary" type="submit" disabled={submitting || !prUrl.trim()}>
            {submitting ? <span className="spinner" /> : 'Review PR'}
          </button>
        </form>
        {error && <p style={{ marginTop: 8, color: 'var(--critical)', fontSize: 13 }}>{error}</p>}
      </div>

      {/* Reviews list */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: '1rem', color: 'var(--muted)' }}>
          Your Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h2>

        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>}

        {!loading && reviews.length === 0 && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p>No reviews yet. Paste a PR URL above to get started.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map((r) => (
            <Link to={`/reviews/${r.id}`} key={r.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, transition: 'border-color .2s', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                    {r.prTitle || `PR #${r.prNumber}`}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {r.repoOwner}/{r.repoName} · #{r.prNumber}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {r.status === 'completed' && (
                    <>
                      {r.criticalCount > 0 && <span className="badge badge-critical">🔴 {r.criticalCount}</span>}
                      {r.majorCount > 0    && <span className="badge badge-major">🟡 {r.majorCount}</span>}
                      {r.minorCount > 0    && <span className="badge badge-minor">🟢 {r.minorCount}</span>}
                      {r.criticalCount === 0 && r.majorCount === 0 && r.minorCount === 0 && <span className="badge badge-minor">✅ Clean</span>}
                    </>
                  )}
                  <StatusDot status={r.status} />
                  <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'capitalize' }}>{r.status}</span>
                  {r.postedToGithub && <span style={{ fontSize: 11, color: 'var(--accent)' }}>· Posted to GitHub</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
