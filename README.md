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
└── references/
    └── ica-sgac-technical-notes.md       # Detailed Angular form interaction patterns
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
- Saves to PNG and sends to the user via messaging platform
- User reads and returns the code; agent types it in

## Usage

This skill is designed for AI agents with browser automation capabilities (e.g. [Hermes Agent](https://hermes-agent.nousresearch.com/)). Load the skill, follow the step-by-step workflow in `SKILL.md`, and use the technical reference for specific Angular interaction patterns.

## Requirements

- Browser with CDP (Chrome DevTools Protocol) access
- `browser_navigate`, `browser_click`, `browser_type`, `browser_press`,
  `browser_console` tools (`browser_press` is required for the Tab-to-validate
  step on Angular forms)
- `execute_code` for decoding/saving the CAPTCHA image
- `vision_analyze` for reading passport/LTVP documents
- Messaging capability to send CAPTCHA images to a human user

## License

MIT — see [LICENSE](LICENSE).
