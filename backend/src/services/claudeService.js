const axios = require('axios');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Build prompt for Claude from parsed diff files
const buildPrompt = (files) => {
  const diffText = files
    .filter((f) => f.patch) // only files with actual changes
    .slice(0, 15)            // cap at 15 files to stay within token limits
    .map((f) => `### File: ${f.filename}\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  return `You are an expert code reviewer. Analyse the following Git diff from a GitHub Pull Request and return a JSON array of issues found.

RULES:
- Return ONLY a valid JSON array, no markdown, no preamble, no explanation.
- Each issue must have exactly these fields:
  {
    "file": "path/to/file.js",
    "line": <line number as integer, use the last line of the issue if a range>,
    "position": <diff position as integer — count from 1 for each hunk line including +/- lines>,
    "severity": "critical" | "major" | "minor",
    "category": "bug" | "security" | "performance" | "style" | "maintainability",
    "title": "<short title, max 8 words>",
    "suggestion": "<clear actionable fix suggestion, 1-3 sentences>"
  }
- severity guide: critical = will break in production / security hole, major = logic error / bad practice, minor = style / naming / small improvements
- If the diff is clean with no real issues, return an empty array: []
- Maximum 20 issues total. Prioritise the most impactful ones.

DIFF:
${diffText}`;
};

// Call Claude API and parse the JSON response
const reviewWithClaude = async (files) => {
  const prompt = buildPrompt(files);

  const response = await axios.post(
    CLAUDE_API_URL,
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  const rawText = response.data.content[0].text.trim();

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```json\n?|^```\n?|```$/gm, '').trim();

  let issues;
  try {
    issues = JSON.parse(cleaned);
  } catch {
    console.error('Claude returned non-JSON:', rawText);
    throw new Error('Claude response was not valid JSON');
  }

  if (!Array.isArray(issues)) throw new Error('Claude response was not an array');

  return issues;
};

// Build the markdown summary comment for posting to GitHub PR thread
const buildSummaryMarkdown = (issues, prTitle) => {
  const critical = issues.filter((i) => i.severity === 'critical');
  const major = issues.filter((i) => i.severity === 'major');
  const minor = issues.filter((i) => i.severity === 'minor');

  const emoji = critical.length > 0 ? '🔴' : major.length > 0 ? '🟡' : '🟢';

  let md = `## ${emoji} AI PR Review — ${prTitle || 'Pull Request'}\n\n`;
  md += `> Automated review powered by Claude AI\n\n`;
  md += `### Summary\n`;
  md += `| Severity | Count |\n|---|---|\n`;
  md += `| 🔴 Critical | ${critical.length} |\n`;
  md += `| 🟡 Major | ${major.length} |\n`;
  md += `| 🟢 Minor | ${minor.length} |\n\n`;

  if (issues.length === 0) {
    md += `✅ **No significant issues found. Looks good!**\n`;
    return md;
  }

  if (critical.length > 0) {
    md += `### 🔴 Critical Issues\n`;
    critical.forEach((i) => {
      md += `- **${i.title}** (\`${i.file}\`): ${i.suggestion}\n`;
    });
    md += '\n';
  }

  if (major.length > 0) {
    md += `### 🟡 Major Issues\n`;
    major.forEach((i) => {
      md += `- **${i.title}** (\`${i.file}\`): ${i.suggestion}\n`;
    });
    md += '\n';
  }

  md += `---\n*This review was generated automatically. Always apply human judgement before merging.*\n`;
  return md;
};

module.exports = { reviewWithClaude, buildSummaryMarkdown };
