const Review = require('../models/Review');
const { parsePrUrl, getPrDetails, getPrFiles, postPrReview, postSummaryComment } = require('../services/githubService');
const { reviewWithClaude, buildSummaryMarkdown } = require('../services/claudeService');

// POST /api/reviews — trigger a new AI review
const createReview = async (req, res) => {
  const { prUrl } = req.body;
  if (!prUrl) return res.status(400).json({ error: 'prUrl is required' });

  let parsed;
  try {
    parsed = parsePrUrl(prUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid GitHub PR URL. Expected format: https://github.com/owner/repo/pull/123' });
  }

  const { owner, repo, prNumber } = parsed;

  // Create a pending review record immediately so frontend can poll
  const review = await Review.create({
    userId: req.user.id,
    prUrl,
    repoOwner: owner,
    repoName: repo,
    prNumber,
    status: 'pending',
  });

  // Run the review async (don't await — return immediately)
  runReview(review, req.user.githubAccessToken, owner, repo, prNumber).catch((err) => {
    console.error('Review failed:', err.message);
    review.update({ status: 'failed' });
  });

  res.status(202).json({ id: review.id, status: 'pending', message: 'Review started' });
};

// Background review runner
const runReview = async (review, token, owner, repo, prNumber) => {
  // Fetch PR details and files in parallel
  const [prDetails, files] = await Promise.all([
    getPrDetails(token, owner, repo, prNumber),
    getPrFiles(token, owner, repo, prNumber),
  ]);

  await review.update({ prTitle: prDetails.title });

  // Send diff to Claude
  const issues = await reviewWithClaude(files);

  // Count severities
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const majorCount = issues.filter((i) => i.severity === 'major').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;

  await review.update({
    status: 'completed',
    reviewData: issues,
    criticalCount,
    majorCount,
    minorCount,
    prTitle: prDetails.title,
  });

  // Store commit sha for later use when posting to GitHub
  review.headSha = prDetails.head;
};

// GET /api/reviews — list current user's reviews
const getReviews = async (req, res) => {
  const reviews = await Review.findAll({
    where: { userId: req.user.id },
    order: [['createdAt', 'DESC']],
    attributes: ['id', 'prUrl', 'prTitle', 'repoOwner', 'repoName', 'prNumber',
      'status', 'criticalCount', 'majorCount', 'minorCount', 'postedToGithub',
      'shareToken', 'createdAt'],
  });
  res.json(reviews);
};

// GET /api/reviews/:id — get full review with issues
const getReview = async (req, res) => {
  const review = await Review.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json(review);
};

// GET /api/reviews/share/:shareToken — public share (no auth required)
const getSharedReview = async (req, res) => {
  const review = await Review.findOne({
    where: { shareToken: req.params.shareToken },
    attributes: ['id', 'prUrl', 'prTitle', 'repoOwner', 'repoName', 'prNumber',
      'status', 'reviewData', 'criticalCount', 'majorCount', 'minorCount', 'createdAt'],
  });
  if (!review) return res.status(404).json({ error: 'Shared review not found' });
  res.json(review);
};

// POST /api/reviews/:id/post-to-github — post review comments back to the PR
const postToGithub = async (req, res) => {
  const review = await Review.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  if (review.status !== 'completed') return res.status(400).json({ error: 'Review not completed yet' });
  if (review.postedToGithub) return res.status(400).json({ error: 'Already posted to GitHub' });

  const token = req.user.githubAccessToken;
  const { repoOwner: owner, repoName: repo, prNumber, reviewData, prTitle } = review;

  // Get current PR head commit
  const prDetails = await getPrDetails(token, owner, repo, prNumber);
  const files = await getPrFiles(token, owner, repo, prNumber);

  // Build a map of filename -> file data for position lookup
  const fileMap = {};
  files.forEach((f) => { fileMap[f.filename] = f; });

  // Build inline comments for issues that have a valid diff position
  const inlineComments = reviewData
    .filter((issue) => issue.position && fileMap[issue.file])
    .map((issue) => ({
      path: issue.file,
      position: issue.position,
      body: buildIssueComment(issue),
    }))
    .slice(0, 10); // GitHub caps inline comments per review

  const summary = buildSummaryMarkdown(reviewData, prTitle);

  let githubCommentId;

  if (inlineComments.length > 0) {
    // Post full review with inline annotations
    const reviewResult = await postPrReview(
      token, owner, repo, prNumber, prDetails.head, inlineComments, summary
    );
    githubCommentId = String(reviewResult.id);
  } else {
    // Fallback: post as a general thread comment if no inline positions
    const commentResult = await postSummaryComment(token, owner, repo, prNumber, summary);
    githubCommentId = String(commentResult.id);
  }

  await review.update({ postedToGithub: true, githubCommentId });

  res.json({ success: true, githubCommentId, inlineCount: inlineComments.length });
};

// Format a single issue as a GitHub markdown comment
const buildIssueComment = (issue) => {
  const badge = { critical: '🔴 **Critical**', major: '🟡 **Major**', minor: '🟢 **Minor**' }[issue.severity] || '';
  const cat = issue.category ? `\`${issue.category}\`` : '';
  return `${badge} ${cat}\n\n**${issue.title}**\n\n${issue.suggestion}\n\n---\n*AI-generated suggestion — review before applying.*`;
};

module.exports = { createReview, getReviews, getReview, getSharedReview, postToGithub };
