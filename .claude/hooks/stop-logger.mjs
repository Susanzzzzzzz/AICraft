// Stop hook — saves conversation transcript as Markdown log
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const LOG_DIR = join(PROJECT_ROOT, 'logs');
const PROJECTS_DIR = join(process.env.HOME, '.claude', 'projects');

// Read hook input from stdin
let input = '';
try {
  const buf = readFileSync('/dev/stdin');
  input = buf.toString();
} catch {}

let hookData;
try { hookData = JSON.parse(input); } catch { process.exit(0); }

const sessionId = hookData.session_id;
if (!sessionId) process.exit(0);

// Find transcript file for this session
let transcriptFile = '';
const slugs = readdirSync(PROJECTS_DIR);
for (const slug of slugs) {
  const candidate = join(PROJECTS_DIR, slug, `${sessionId}.jsonl`);
  if (existsSync(candidate)) {
    transcriptFile = candidate;
    break;
  }
}
if (!transcriptFile) process.exit(0);

// Read and parse transcript
const lines = readFileSync(transcriptFile, 'utf-8').split('\n').filter(Boolean);
const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

// Determine topic from first meaningful user message
let topic = 'unknown';
for (const e of entries) {
  if (e.type === 'user' && e.message?.content) {
    const c = typeof e.message.content === 'string' ? e.message.content :
             Array.isArray(e.message.content) ? e.message.content.map(b => b.text || '').join(' ') : '';
    const clean = c.replace(/<[^>]+>/g, '').trim().slice(0, 60);
    if (clean) { topic = clean; break; }
  }
}

// Timestamp for filename and display
const now = new Date();
const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
const timeStr = now.toISOString().slice(11, 16).replace(':', '');
const filename = `${dateStr}_${timeStr}_${topic.replace(/[^a-zA-Z0-9一-鿿]/g, '_').slice(0, 40)}.md`;
const outputPath = join(LOG_DIR, filename);

// Helper: flatten content blocks to text
function flattenContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(b => {
      switch (b.type) {
        case 'text': return b.text || '';
        case 'thinking': return `[思考]\n${b.thinking || ''}\n`;
        case 'tool_use': return `\n[工具调用: ${b.name}]\n\`\`\`json\n${JSON.stringify(b.input, null, 2)}\n\`\`\`\n`;
        case 'tool_result': return `\n[工具结果]\n\`\`\`\n${(b.content || '').slice(0, 1000)}\n\`\`\`\n`;
        default: return '';
      }
    }).join('\n');
  }
  return JSON.stringify(content);
}

// Helper: format a timestamp
function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

// Build markdown
let md = `# 对话日志\n\n`;
md += `**日期**: ${now.toLocaleString('zh-CN')}\n\n`;
md += `**会话ID**: \`${sessionId}\`\n\n`;
md += `**主题**: ${topic}\n\n`;
md += `---\n\n`;

for (const e of entries) {
  const ts = fmtTime(e.timestamp);

  if (e.type === 'user' && e.message?.content && e.message.role === 'user') {
    // Skip tool_result blocks inside user messages (they're tool outputs, not user speech)
    const content = e.message.content;
    if (Array.isArray(content)) {
      const textBlocks = content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) {
        md += `## 🧑 User\n\n`;
        md += `_${ts}_\n\n`;
        for (const b of textBlocks) {
          md += b.text + '\n\n';
        }
      }
    }
  }

  // Assistant messages
  if (e.message?.role === 'assistant' && e.message?.content) {
    md += `## 🤖 Assistant\n\n`;
    if (ts) md += `_${ts}_\n\n`;
    const content = e.message.content;
    if (typeof content === 'string') {
      md += content + '\n\n';
    } else if (Array.isArray(content)) {
      const textBlocks = content.filter(b => b.type === 'text');
      const toolBlocks = content.filter(b => b.type === 'tool_use');
      const thinkBlocks = content.filter(b => b.type === 'thinking');

      if (thinkBlocks.length > 0) {
        md += `### 思考过程\n\n`;
        for (const b of thinkBlocks) {
          md += b.thinking + '\n\n';
        }
      }

      if (textBlocks.length > 0) {
        for (const b of textBlocks) {
          md += b.text + '\n\n';
        }
      }

      if (toolBlocks.length > 0) {
        for (const b of toolBlocks) {
          md += `### 🛠 ${b.name}\n\n`;
          md += `\`\`\`json\n${JSON.stringify(b.input, null, 2)}\n\`\`\`\n\n`;
        }
      }
    }

    // Check for tool results in subsequent user messages
    const toolResults = [];
    // Find the next user messages that correspond to tool results
    const eIdx = entries.indexOf(e);
    for (let j = eIdx + 1; j < Math.min(eIdx + 10, entries.length); j++) {
      const next = entries[j];
      if (next.type === 'user' && Array.isArray(next.message?.content)) {
        for (const b of next.message.content) {
          if (b.type === 'tool_result' && b.content) {
            toolResults.push({ id: b.tool_use_id, content: b.content });
          }
        }
      }
      if (next.type === 'user' && next.message?.role === 'user' && !next.message.content?.some?.(b => b.type === 'tool_result')) {
        break; // Stop at next real user message
      }
      if (next.message?.role === 'assistant') break;
    }
    if (toolResults.length > 0) {
      for (const tr of toolResults) {
        md += `#### 结果\n\n`;
        const text = typeof tr.content === 'string' ? tr.content.slice(0, 500) : JSON.stringify(tr.content).slice(0, 500);
        md += '```\n' + text + '\n```\n\n';
      }
    }
  }
}

md += `---\n\n*由自动日志系统生成*\n`;

writeFileSync(outputPath, md, 'utf-8');
console.log(JSON.stringify({ systemMessage: `📝 对话日志已保存: ${filename}` }));
