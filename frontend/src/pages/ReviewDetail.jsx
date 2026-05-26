import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReview, postToGithub } from '../api/client';

const severityOrder = { critical: 0, major: 1, minor: 2 };

const IssueCard = ({ issue }) => (
  <div className="card" style={{ padding: '1rem 1.25rem', borderLeft: `3px solid ${issue.severity === 'critical' ? 'var(--critical)' : issue.severity === 'major' ? 'var(--major)' : 'var(--minor)'}` }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 14 }}>{issue.title}</div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
        {issue.category && <span className={`badge badge-${issue.category}`}>{issue.category}</span>}
      </div>
    </div>
    <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 8, fontFamily: 'monospace' }}>
      {issue.file}{issue.line ? `:${issue.line}` : ''}
    </div>
    <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>{issue.suggestion}</p>
  </div>
);

export default function ReviewDetail() {
  const { id } = useParams();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(false);

  const fetchReview = async () => {
    try {
      const res = await getReview(id);
      setReview(res.data);
    } catch { /* handled */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchReview();
    // Poll if pending
    const interval = setInterval(() => {
      if (review?.status === 'pending') fetchReview();
    }, 3000);
    return () => clearInterval(interval);
  }, [id, review?.status]);

  const handlePostToGithub = async () => {
    setPosting(true);
    try {
      const res = await postToGithub(id);
      setPostResult(res.data);
      fetchReview();
    } catch (err) {
      setPostResult({ error: err.response?.data?.error || 'Failed to post' });
    } finally { setPosting(false); }
  };

  const handleCopyShare = () => {
    const url = `${window.location.origin}/share/${review.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}><div className="spinner" /></div>;
  if (!review) return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--muted)' }}>Review not found.</div>;

  const issues = review.reviewData || [];
  const sorted = [...issues].sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));
  const filtered = filter === 'all' ? sorted : sorted.filter(i => i.severity === filter);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Back */}
      <Link to="/dashboard" style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1.5rem' }}>← Back to Dashboard</Link>

      {/* Header */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{review.prTitle || `PR #${review.prNumber}`}</h1>
            <a href={review.prUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {review.repoOwner}/{review.repoName} · #{review.prNumber} ↗
            </a>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {review.status === 'completed' && !review.postedToGithub && (
              <button className="btn btn-primary" onClick={handlePostToGithub} disabled={posting}>
                {posting ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Posting...</> : '💬 Post to GitHub'}
              </button>
            )}
            {review.postedToGithub && <span className="btn btn-outline" style={{ cursor: 'default', color: 'var(--minor)' }}>✅ Posted to GitHub</span>}
            {review.status === 'completed' && (
              <button className="btn btn-outline" onClick={handleCopyShare}>{copied ? '✅ Copied!' : '🔗 Share Link'}</button>
            )}
          </div>
        </div>

        {postResult && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: postResult.error ? 'rgba(255,92,92,.1)' : 'rgba(67,217,143,.1)', color: postResult.error ? 'var(--critical)' : 'var(--minor)', fontSize: 13 }}>
            {postResult.error ? `❌ ${postResult.error}` : `✅ Posted with ${postResult.inlineCount} inline comment${postResult.inlineCount !== 1 ? 's' : ''}`}
          </div>
        )}

        {/* Counts */}
        {review.status === 'completed' && (
          <div style={{ display: 'flex', gap: 12, marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: '🔴 Critical', count: review.criticalCount, key: 'critical' },
              { label: '🟡 Major', count: review.majorCount, key: 'major' },
              { label: '🟢 Minor', count: review.minorCount, key: 'minor' },
            ].map(({ label, count, key }) => (
              <div key={key} style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
              </div>
            ))}
            <div style={{ background: 'var(--bg3)', borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{issues.length}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total</div>
            </div>
          </div>
        )}

        {review.status === 'pending' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: '1rem', color: 'var(--muted)', fontSize: 14 }}>
            <div className="spinner" /> Analysing PR with Claude AI...
          </div>
        )}
        {review.status === 'failed' && (
          <div style={{ marginTop: '1rem', color: 'var(--critical)', fontSize: 14 }}>
            ❌ Review failed{review.failureReason ? `: ${review.failureReason}` : '. Please try again.'}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          {['all', 'critical', 'major', 'minor'].map((f) => (
            <button key={f} className={`btn ${filter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '6px 14px', fontSize: 13, textTransform: 'capitalize' }}
              onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${issues.length})` : `${f} (${issues.filter(i => i.severity === f).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Issues */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && review.status === 'completed' && (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--minor)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p>{filter === 'all' ? 'No issues found — this PR looks clean!' : `No ${filter} issues found.`}</p>
          </div>
        )}
        {filtered.map((issue, i) => <IssueCard key={i} issue={issue} />)}
      </div>
    </div>
  );
}
