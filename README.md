# SG Arrival Card (SGAC) Skill

A browser-automation skill for submitting Singapore Arrival Cards via the [ICA e-Services portal](https://eservices.ica.gov.sg/sgarrivalcard/).

## What It Does

- Submits SG Arrival Cards for travellers returning to Singapore by air
- Supports all three residency pathways: SC/PR, Long-Term Pass Holder, and Foreign Visitor
- Handles group submissions — multiple travellers of the same pathway in one submission
- Navigates the Angular SPA's browser-automation quirks (reactive form validation, custom toggle buttons, CAPTCHA)
- Extracts and routes CAPTCHA images to the user for solving

## Why This Exists

The ICA SGAC portal is an Angular single-page application with reactive forms that don't respond to standard browser automation. Setting `.value` via JavaScript doesn't trigger Angular's change detection, button clicks via CDP don't fire Angular event bindings, and the CAPTCHA can't be read by AI vision models. This skill encodes the workarounds discovered through real submissions.

## Skill Structure

```
sg-arrival-card-skill/
├── SKILL.md                              # Main skill documentation
├── README.md                             # This file
├── LICENSE                               # MIT License
├── references/
│   ├── portability.md                    # Capability → tool mapping per agent
│   └── ica-sgac-technical-notes.md       # Detailed Angular form interaction patterns
└── scripts/                              # Bundled browser-automation helpers
    ├── js_click_by_text.js               # JS-click an Angular button by text
    ├── set_health_no.js                  # Set health toggles to NO (confirmed answers only)
    ├── check_declaration.js              # Tick the review-page declaration checkbox
    ├── extract_captcha.js                # Extract the CAPTCHA image (chunked)
    └── save_captcha.py                   # Decode + save the CAPTCHA PNG
```

## Key Features

### Three Residency Pathways
| Pathway | ID Required | Who |
|---------|------------|-----|
| SC/PR | NRIC | Singapore Citizens & Permanent Residents |
| Long-Term Pass Holder | FIN | LTVP, DP, EP, SP holders |
| Foreign Visitor / IPA | Passport No + Nationality | Visitors without SG passes |

### Group Submissions
Multiple travellers on the same pathway can be submitted together using the "Add Traveller" button — one CAPTCHA, one confirmation email for the entire group.

### Angular Form Workarounds
- Click → Type → Tab sequence for reliable form validation
- JS `.click()` fallback for non-responsive Angular buttons
- `button_Selected` class verification for YES/NO toggles
- JS checkbox click for the declaration on the review page

### CAPTCHA Handling
- Extracts CAPTCHA image as base64 from the dialog
- Saves to PNG and sends it back to the user **in the same conversation/DM**,
  delivered losslessly (as a file/document, e.g. `[[as_document]]` on Hermes) so
  the distorted text stays legible
- User reads and returns the code; agent types it in

### Safety
- **Health declarations** are answered from the traveller's actual status —
  never auto-answered NO (a false declaration to ICA is an offence)
- **Explicit user confirmation** is required before the final, non-editable
  submission
- **Traveller PII** (passport/NRIC/FIN) is kept in an uncommitted local data
  file — never committed to the repo

## Usage

This skill is **capability-first** and portable across agents — it follows the
[agentskills.io](https://agentskills.io) open standard, so the `SKILL.md` +
`scripts/` + `references/` layout loads on [Hermes Agent](https://hermes-agent.nousresearch.com/),
Claude Code, OpenClaw, and Codex CLI. The workflow refers to abstract
capabilities; bind them to your agent's concrete tools using
[`references/portability.md`](references/portability.md). Load the skill, follow
the workflow in `SKILL.md`, and use the technical reference for Angular
interaction details.

## Requirements

The skill needs an agent that can provide these capabilities (see
[`references/portability.md`](references/portability.md) for the per-agent tool
mapping):

- **Browser automation** — open a URL, click, type, press Tab, and run
  JavaScript in the page (typically via a CDP/MCP browser tool). The Tab/blur
  step is required for Angular form validation.
- **Host-side code execution** — to decode/save the CAPTCHA image.
- **Vision** — to read passport/pass documents.
- **User interaction** — to ask the user a question and to send them the CAPTCHA
  image (delivered losslessly).

## License

MIT — see [LICENSE](LICENSE).
