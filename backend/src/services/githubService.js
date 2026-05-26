const axios = require('axios');

const githubApi = (token) =>
  axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

// Parse PR URL like https://github.com/owner/repo/pull/123
const parsePrUrl = (prUrl) => {
  const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) throw new Error('Invalid GitHub PR URL');
  return { owner: match[1], repo: match[2], prNumber: parseInt(match[3]) };
};

// Fetch PR metadata
const getPrDetails = async (token, owner, repo, prNumber) => {
  const api = githubApi(token);
  const { data } = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}`);
  return {
    title: data.title,
    body: data.body,
    state: data.state,
    head: data.head.sha,
    base: data.base.sha,
    htmlUrl: data.html_url,
  };
};

// Fetch PR diff (raw unified diff format)
const getPrDiff = async (token, owner, repo, prNumber) => {
  const api = githubApi(token);
  const { data } = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3.diff',
    },
  });
  return data;
};

// Fetch list of files changed in PR with their patch + diff positions
const getPrFiles = async (token, owner, repo, prNumber) => {
  const api = githubApi(token);
  const { data } = await api.get(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
  return data; // Array of { filename, patch, position, additions, deletions, ... }
};

// Post a full review with inline comments directly on the PR
// comments = [{ path, position, body }]
const postPrReview = async (token, owner, repo, prNumber, commitSha, comments, summary) => {
  const api = githubApi(token);

  // GitHub requires at least one comment or a body to create a review
  const { data } = await api.post(`/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, {
    commit_id: commitSha,
    body: summary,
    event: 'COMMENT', // COMMENT = no approve/reject, just informational
    comments: comments.map((c) => ({
      path: c.path,
      position: c.position, // diff position (not line number!)
      body: c.body,
    })),
  });

  return data;
};

// Post a general summary comment on the PR thread (issue comment)
const postSummaryComment = async (token, owner, repo, prNumber, body) => {
  const api = githubApi(token);
  const { data } = await api.post(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    body,
  });
  return data;
};

module.exports = { parsePrUrl, getPrDetails, getPrDiff, getPrFiles, postPrReview, postSummaryComment };
