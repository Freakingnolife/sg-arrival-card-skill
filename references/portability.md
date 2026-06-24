# Portability — Capability → Tool Mapping

This skill is written **capability-first**: the procedure refers to abstract
capabilities (e.g. *Click*, *PageJS*, *AskUser*) instead of one agent's tool
names. To run it on a given agent, map each capability to that agent's concrete
tool using the table below. The skill itself does not change — only this table.

The `SKILL.md` + `scripts/` + `references/` layout follows the
[agentskills.io](https://agentskills.io) open standard, so the files load
as-is on Hermes Agent, Claude Code, OpenClaw, and Codex CLI. Only the tool
bindings differ.

## Capabilities used by this skill

| Capability | Meaning |
|------------|---------|
| **Open(url)** | Navigate the browser to a URL |
| **Click(target)** | Click a DOM element / button |
| **Type(text)** | Type text into the focused input |
| **Commit** | Blur the field (press Tab) so the form validates it |
| **PageJS(script)** | Execute JavaScript inside the page (DOM access) |
| **RunCode(script)** | Run host-side code (e.g. Python) outside the page |
| **ReadDoc(image)** | Extract fields from a passport/pass image via vision |
| **AskUser(question)** | Ask the human a question and receive the answer |
| **SendFile(path)** | Deliver a file (e.g. the CAPTCHA image) to the human, losslessly for images |

## Per-agent mapping

> Browser capabilities are usually provided by an MCP server, so exact names
> depend on which server is installed (e.g. Playwright MCP vs chrome-devtools
> MCP). The names below are typical; confirm against your installed tools.

| Capability | Hermes Agent | Claude Code | OpenClaw | Codex CLI |
|------------|--------------|-------------|----------|-----------|
| Open(url) | `browser_navigate` | browser MCP navigate (e.g. `browser_navigate`) | browser MCP navigate | browser MCP navigate |
| Click(target) | `browser_click` | browser MCP `click` / `browser_click` | browser MCP click | browser MCP click |
| Type(text) | `browser_type` | browser MCP `type` / `fill` | browser MCP type | browser MCP type |
| Commit (Tab) | `browser_press` (Tab) | browser MCP `press_key` (Tab) | browser MCP press key | browser MCP press key |
| PageJS(script) | `browser_console` | browser MCP `evaluate` / `evaluate_script` | browser MCP evaluate | browser MCP evaluate |
| RunCode(script) | `execute_code` | `Bash` (run the script file) | shell / bash tool | shell exec |
| ReadDoc(image) | `vision_analyze` | model reads the image (e.g. `Read` an image file) | vision tool | model vision |
| AskUser(question) | `clarify` | ask inline in the conversation | inline prompt to user | inline prompt to user |
| SendFile(path) | `send_message` + `MEDIA:<path>` | reference/open the local file in chat | message attachment | output the file path / attach |

## Directive & token equivalents

| Hermes-specific | Portable equivalent |
|-----------------|---------------------|
| `${HERMES_SKILL_DIR}/scripts/x.js` | `scripts/x.js` — a path relative to this skill's directory |
| `[[as_document]]` (lossless media) | Attach the image as a file/document, not an inline preview, so compression doesn't blur the CAPTCHA |
| `MEDIA:<path>` send convention | However your agent attaches a file to a message |
| `metadata.hermes.requires_tools` | Hermes-only activation hint; other agents ignore it (no effect) |

## Lossless image delivery

The CAPTCHA is distorted text — messaging-platform compression can render it
unreadable. Whatever **SendFile** maps to, deliver the PNG as a **file /
document attachment** (lossless), not a re-encoded inline thumbnail. On Hermes
this is the `[[as_document]]` directive.

## Notes per agent

- **Claude Code** — Skills live in `.claude/skills/<name>/`. Reads `name` +
  `description` frontmatter; extra fields (incl. `metadata.hermes.*`) are
  ignored. Host code is `Bash`; "send to user" means referencing/opening the
  local file (already lossless). No `clarify` — just ask in the conversation.
- **OpenClaw** — Uses the same SKILL.md standard as Claude Code, so the skill
  loads unmodified; bind the browser/shell/vision capabilities to its tools.
- **Codex CLI** — Reads SKILL.md skills via the open standard; also supports
  `AGENTS.md` for repo-level instructions. Host code runs in its shell.
- **Hermes Agent** — Native target; bindings are the left-most column and the
  `${HERMES_SKILL_DIR}` token resolves bundled scripts.
