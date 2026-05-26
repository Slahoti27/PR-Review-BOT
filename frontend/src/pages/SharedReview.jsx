import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedReview } from '../api/client';

const severityOrder = { critical: 0, major: 1, minor: 2 };

export default function SharedReview() {
  const { shareToken } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSharedReview(shareToken)
      .then(res => setReview(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>;
  if (!review) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--muted)' }}>Review not found or link expired.</div>;

  const issues = [...(review.reviewData || [])].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{review.prTitle || `PR #${review.prNumber}`}</h1>
        <a href={review.prUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--muted)' }}>
          {review.repoOwner}/{review.repoName} · #{review.prNumber} ↗
        </a>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1rem' }}>
          <span className="badge badge-critical">🔴 {review.criticalCount} critical</span>
          <span className="badge badge-major">🟡 {review.majorCount} major</span>
          <span className="badge badge-minor">🟢 {review.minorCount} minor</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {issues.map((issue, i) => (
          <div key={i} className="card" style={{ padding: '1rem 1.25rem', borderLeft: `3px solid ${issue.severity === 'critical' ? 'var(--critical)' : issue.severity === 'major' ? 'var(--major)' : 'var(--minor)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{issue.title}</div>
              <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8, fontFamily: 'monospace' }}>{issue.file}{issue.line ? `:${issue.line}` : ''}</div>
            <p style={{ fontSize: 14, color: 'var(--muted)' }}>{issue.suggestion}</p>
          </div>
        ))}
        {issues.length === 0 && <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--minor)' }}>✅ No issues found</div>}
      </div>

      <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: 12, color: 'var(--muted)' }}>
        Powered by <a href="/">PR Review Bot</a> · AI-generated — apply human judgement
      </div>
    </div>
  );
}
