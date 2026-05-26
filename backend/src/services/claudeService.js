const axios = require('axios');

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const MAX_FILES = 15;
const MAX_PATCH_CHARS = 12000;
const MAX_TOTAL_DIFF_CHARS = 90000;
const MAX_ISSUES = 8;

const formatApiError = (provider, error) => {
  if (!error.response) return error.message;

  const details = error.response.data?.error?.message
    || error.response.data?.message
    || JSON.stringify(error.response.data);

  return `${provider} API ${error.response.status}: ${details}`;
};

// Build prompt for the configured AI provider from parsed diff files
const buildPrompt = (files) => {
  let totalChars = 0;

  const diffText = files
    .filter((f) => f.patch) // only files with actual changes
    .slice(0, MAX_FILES)     // cap files to stay within token limits
    .map((f) => {
      const remaining = MAX_TOTAL_DIFF_CHARS - totalChars;
      if (remaining <= 0) return null;

      const patch = f.patch.slice(0, Math.min(MAX_PATCH_CHARS, remaining));
      totalChars += patch.length;

      const truncated = patch.length < f.patch.length
        ? '\n...diff truncated for size...'
        : '';

      return `### File: ${f.filename}\n\`\`\`diff\n${patch}${truncated}\n\`\`\``;
    })
    .filter(Boolean)
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
    "title": "<short title, max 6 words>",
    "suggestion": "<specific fix, max 120 characters>"
  }
- severity guide: critical = will break in production / security hole, major = logic error / bad practice, minor = style / naming / small improvements
- If the diff is clean with no real issues, return an empty array: []
- Maximum ${MAX_ISSUES} issues total. Prioritise the most impactful ones.
- Keep the JSON compact. Do not pretty-print.

DIFF:
${diffText}`;
};

const reviewWithAnthropic = async (prompt) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  let response;
  try {
    response = await axios.post(
      CLAUDE_API_URL,
      {
        model: process.env.ANTHROPIC_MODEL || DEFAULT_CLAUDE_MODEL,
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
  } catch (error) {
    throw new Error(formatApiError('Claude', error));
  }

  return response.data.content?.[0]?.text?.trim() || '';
};

const reviewWithGemini = async (prompt) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  let response;
  try {
    response = await axios.post(
      `${GEMINI_API_URL}/${model}:generateContent`,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: {
          'x-goog-api-key': process.env.GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    throw new Error(formatApiError('Gemini', error));
  }

  return response.data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || '')
    .join('')
    .trim() || '';
};

const parseCompleteObjectsFromArray = (text) => {
  const issues = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        try {
          issues.push(JSON.parse(text.slice(start, i + 1)));
        } catch {
          // Ignore malformed objects and keep any complete findings we can use.
        }
        start = -1;
      }
    }
  }

  return issues;
};

const parseIssues = (rawText) => {
  if (!rawText) throw new Error('AI response was empty');

  // Strip any accidental markdown fences
  const cleaned = rawText.replace(/^```json\n?|^```\n?|```$/gm, '').trim();

  let issues;
  try {
    issues = JSON.parse(cleaned);
  } catch {
    const partialIssues = parseCompleteObjectsFromArray(cleaned);
    if (partialIssues.length > 0) return partialIssues;

    console.error('AI provider returned non-JSON:', rawText);
    throw new Error('AI provider response was not valid JSON');
  }

  if (!Array.isArray(issues)) throw new Error('AI provider response was not an array');

  return issues;
};

// Call the configured AI provider and parse the JSON response.
// Kept as reviewWithClaude so the controller import does not need to change.
const reviewWithClaude = async (files) => {
  const prompt = buildPrompt(files);
  const provider = (process.env.AI_PROVIDER || '').toLowerCase();

  const useGemini = provider === 'gemini'
    || (!provider && process.env.GEMINI_API_KEY);

  const rawText = useGemini
    ? await reviewWithGemini(prompt)
    : await reviewWithAnthropic(prompt);

  return parseIssues(rawText);
};

// Build the markdown summary comment for posting to GitHub PR thread
const buildSummaryMarkdown = (issues, prTitle) => {
  const critical = issues.filter((i) => i.severity === 'critical');
  const major = issues.filter((i) => i.severity === 'major');
  const minor = issues.filter((i) => i.severity === 'minor');

  const emoji = critical.length > 0 ? '🔴' : major.length > 0 ? '🟡' : '🟢';

  let md = `## ${emoji} AI PR Review — ${prTitle || 'Pull Request'}\n\n`;
  md += `> Automated AI-generated review\n\n`;
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
