---
name: sg-arrival-card
description: Submit Singapore Arrival Cards (SGAC) via the ICA e-services portal. Covers SC/PR, Long-Term Pass Holder, and Foreign Visitor pathways, Angular form quirks, CAPTCHA handling, and group submissions.
version: 1.0.0
author: sgdadbuilds
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [singapore, immigration, travel, government-forms, browser-automation, sgac]
    requires_tools:
      - browser_navigate
      - browser_click
      - browser_type
      - browser_press
      - browser_console
      - execute_code
      - send_message
      - clarify
      - vision_analyze
---

# SG Arrival Card (SGAC) Submission

Use this skill when submitting Singapore Arrival Cards for travellers
returning to Singapore by air. The ICA portal at
`https://eservices.ica.gov.sg/sgarrivalcard/` is an Angular SPA with specific
browser-automation quirks that standard tooling does not handle.

This skill is **capability-first** and portable across agents (Hermes Agent,
Claude Code, OpenClaw, Codex CLI). The procedure refers to abstract
capabilities; bind them to your agent's concrete tools using
`references/portability.md`.

## When to Use

- Travellers returning to Singapore from overseas
- Submit within a **3-day window**: the arrival day plus the 2 days before it
  (i.e. arrival is 0–2 days out)
- Required for: SC citizens, PRs, LTVP holders, foreign visitors — everyone
  except transit passengers who don't pass immigration

## Capabilities

This skill is written in terms of these abstract capabilities. Map each to your
agent's tools via `references/portability.md` (the Hermes bindings are listed
there too).

- **Open(url)** — navigate the browser to a URL
- **Click(target)** — click a DOM element / button
- **Type(text)** — type into the focused input
- **Commit** — blur the field (press Tab) so Angular validates it
- **PageJS(script)** — run JavaScript inside the page
- **RunCode(script)** — run host-side code (e.g. Python) outside the page
- **ReadDoc(image)** — extract fields from a passport/pass image via vision
- **AskUser(question)** — ask the human and receive an answer
- **SendFile(path)** — deliver a file to the human (lossless for images)

> Bundled helper scripts live in `scripts/` (paths are relative to this skill's
> directory). On Hermes, reference them as `${HERMES_SKILL_DIR}/scripts/…`.

## Quick Reference

| Pathway | Button | ID field | Format |
|---------|--------|----------|--------|
| Singapore Citizen / PR | "Singapore Citizen / Permanent Resident" | NRIC | S/T + 7 digits + letter |
| LTVP / DP / EP / SP | "Long-Term Pass Holder" | FIN | G/F/M + 7 digits + letter |
| Foreign Visitor (no pass) | "Foreign Visitor / IPA Holder" | Passport No + Nationality | varies |

**Golden rule for every input:** Click → Type → **Commit (Tab)**. Setting
`.value` via JS does NOT trigger Angular validation.

**Helper scripts** (run via **PageJS** / **RunCode**):
- `scripts/js_click_by_text.js` — Click an Angular button by text (PageJS)
- `scripts/set_health_no.js` — set health toggles to NO, only when confirmed NO (PageJS)
- `scripts/check_declaration.js` — tick the review-page declaration checkbox (PageJS)
- `scripts/extract_captcha.js` — pull the CAPTCHA image, chunked (PageJS)
- `scripts/save_captcha.py` — decode + save the CAPTCHA PNG (RunCode)

## Traveller Documents

Store passport and pass details in a local data file (e.g.
`data/traveller_documents.md`). Key identifiers needed per person:

| Pathway | ID Field | Format | Source |
|---------|----------|--------|--------|
| SC/PR | NRIC | S/T + 7 digits + letter | Singapore passport (bottom section, "National ID No") |
| LTVP/DP/EP/SP | FIN | G/F/M + 7 digits + letter | LTVP/pass card (front side, top-right) |
| Foreign Visitor | Passport No | Varies | Passport bio page |

> When a new traveller needs SGAC, ask for their passport/NRIC and add to the
> data file. Users may send passport photos — use **ReadDoc** to extract
> details.

> ⚠️ **This data file contains sensitive PII (passport numbers, NRIC/FIN, DOB).**
> - Keep it **outside any git repository**, or add it to `.gitignore` — never
>   commit it.
> - Do not paste these identifiers into commit messages, logs, or external
>   channels.
> - Treat it as confidential and delete it when it is no longer needed.

## Procedure

### Step 1 — Determine pathway

- **Singapore Citizen / PR** → "Singapore Citizen / Permanent Resident" button.
  Requires **NRIC**.
- **LTVP / DP / EP / SP etc.** → "Long-Term Pass Holder" button. Requires
  **FIN**.
- **Foreign visitor (no LTVP)** → "Foreign Visitor / IPA Holder" button.
  Requires passport number + nationality.

### Step 2 — Navigate to the form

1. **Open** `https://eservices.ica.gov.sg/sgarrivalcard/`
2. **Click** "Submit SGAC" — ⚠️ a normal Click may not register on this Angular
   button. If the page doesn't change, **PageJS** the JS-click helper
   `scripts/js_click_by_text.js` (set `TARGET_TEXT` to `'Submit SGAC'`).
3. **Click** the appropriate residency type button. Same PageJS fallback applies.

### Step 3 — Fill the traveller information form

**CRITICAL — Angular reactive forms require the proper interaction sequence.**
Setting `.value` via JS does NOT trigger Angular's form validation. For each
field you MUST:

1. **Click** the input field (focuses it)
2. **Type** the value
3. **Commit** by pressing Tab (triggers blur → Angular validates)

If you skip Commit, Angular may not register the value and you'll get "Please
fill in the field above" errors on fields that visibly contain text.

#### Fields (SC/PR pathway):
- **Date of Arrival** — 3 button options (today, tomorrow, day-after). Click
  the correct date button.
- **NRIC** — text input
- **Name** — text input (FULL CAPS as on passport)
- **Date of Birth** — text input, DD/MM/YYYY format
- **Email Address** — text input (contact email for confirmation)
- **Health Declarations** — see below.

#### Fields (LTVP pathway):
Same as above but **FIN** instead of NRIC. Foreign Visitor pathway also adds
nationality + passport number.

#### Health declaration questions (⚠️ do NOT assume the answers):
These are **official declarations** — answer each based on the traveller's
**actual** status. Never blanket-click NO.
- **Q1** — "Do you have fever, cough…?"
- **Q2** — "Visited yellow-fever-risk countries in the past 6 days?" (appears
  AFTER answering Q1)
- If you do not know the traveller's true answer, **AskUser** before selecting.
- For a healthy traveller with no relevant recent travel the answers are
  typically NO — but **confirm first**. Submitting a false health declaration
  to ICA is an offence.
- Once the real answer is confirmed NO, you may set the toggles via **PageJS**
  with `scripts/set_health_no.js`. For a YES answer, click the YES toggle and
  complete any follow-up fields.

#### YES/NO buttons:
Custom Angular toggle buttons, not standard radio buttons. Click via normal
**Click** or **PageJS**. Verify selection by checking for the `button_Selected`
class (see `references/ica-sgac-technical-notes.md`).

### Step 4 — Add additional travellers (group submission)

**USE GROUP SUBMISSION whenever multiple travellers share the same pathway.**
This is the preferred approach — one submission, one CAPTCHA, one confirmation
email covering all travellers. Do NOT submit individually unless group fails.

The **"Add Traveller | +"** button adds a new traveller section below the
current one. All travellers share the same arrival date.

**Group submission workflow:**
1. Fill Lead Traveller completely (all fields + health declarations)
2. Ensure ALL fields pass validation (no "Please fill in the field above" errors)
3. **Click** "Add Traveller | +" — a new traveller section appears
4. Fill the new traveller: ID, Name, DOB, Email, Health Declarations (same fields
   except Date of Arrival is shared)
5. Repeat for each additional traveller
6. **Click** Next → Review page shows ALL travellers
7. One CAPTCHA, one confirmation for the entire group

**If Add Traveller doesn't seem to work:**
- Check for hidden validation errors on existing fields (email field is the
  usual culprit — re-Type and Commit)
- Try clicking Add Traveller via **PageJS** (`scripts/js_click_by_text.js` with
  `TARGET_TEXT = 'Add Traveller'`)
- As a last resort, submit individually via "Make Another Submission"

#### Cross-pathway submissions

When travellers are on **different pathways** (e.g. one is SC, another is
LTVP), they **cannot** be combined in a single submission. Each pathway is a
separate form with different fields (NRIC vs FIN). Submit each pathway group
separately:

1. Complete all SC/PR travellers first
2. Start a new submission for LTVP travellers
3. Start a new submission for foreign visitors if needed

### Step 5 — Review page

1. Verify all details are correct
2. **Check the declaration checkbox** — ⚠️ a normal Click on the checkbox may
   not register. Use **PageJS** with `scripts/check_declaration.js`.
3. **Click** Next

### Step 6 — Confirm with the user before final submission

⚠️ SGAC submission is an **official government action** and **cannot be edited
after submitting** (you can only start a new submission). Before solving the
CAPTCHA / clicking the final Submit:

1. Summarise **every traveller's** key details back to the user — name, ID,
   DOB, arrival date, email, and the health-declaration answers.
2. Get **explicit confirmation** via **AskUser** (e.g. "Submit these N arrival
   cards now?").
3. Only proceed once the user confirms. If anything is wrong, go back and fix
   it before continuing.

### Step 7 — CAPTCHA (Security Verification)

A modal dialog appears with a distorted-text CAPTCHA image. The vision model
may refuse to read CAPTCHAs (safety policy), so route it to the user.

**Workflow:**
1. **PageJS** `scripts/extract_captcha.js` to pull the CAPTCHA image (returns
   chunks for long data URLs).
2. **RunCode** `scripts/save_captcha.py` to reassemble + save the PNG.
3. **SendFile** the image back to the user **in the same conversation/DM the
   request came from** — delivered **losslessly** (as a file/document, not a
   re-compressed inline preview), since compression can make the distorted text
   unreadable. Reply to the active thread; never post to a separate or
   hardcoded channel.
4. **AskUser** to read the CAPTCHA text (same thread).
5. **Type** the answer into the CAPTCHA input and **Click** Submit.

**Alternative:** Use the "Play Audio" button for an audio CAPTCHA if the text
is unreadable.

### Step 8 — Confirmation

Success page shows "Your Singapore Arrival Card submission is successful!"
- Acknowledgement email sent to the provided email address
- Options: Print, Download PDF, Submit Cash Declaration, Submit Customs
  Declaration
- Click "Make Another Submission" to continue with the next pathway group

## Pitfalls

- ❌ **Do NOT use a normal Click on Angular buttons that don't respond** —
  switch to the JS `.click()` helper via **PageJS**.
- ❌ **Do NOT set input values via JS `.value =`** — Angular reactive forms
  won't validate. Always Click → Type → Commit.
- ❌ **Do NOT skip Commit (Tab) after typing** — without blur, Angular doesn't
  update the form control's validity state.
- ❌ **Do NOT assume health-declaration answers** — never blanket-click NO.
  Answer from the traveller's real status; **AskUser** if unsure. A false
  declaration to ICA is an offence.
- ❌ **Do NOT submit without explicit user confirmation** — the submission is
  official and cannot be edited afterward.
- ❌ **Do NOT try to read the CAPTCHA with vision (ReadDoc)** — the vision model
  may refuse CAPTCHA reading due to safety policies. Send to the user instead.
- ❌ **Do NOT commit the traveller data file** — it contains PII.
- ✅ **Always try group submission first** when multiple travellers share the
  same pathway — use "Add Traveller | +".
- ✅ **Always verify YES/NO buttons are selected** before clicking Next.
- ✅ **Save passport/pass details** to the (uncommitted) data file after first
  extraction so future submissions don't require re-reading the documents.

## Verification

A submission is successful only when **all** of the following hold:
- The success page shows "Your Singapore Arrival Card submission is
  successful!"
- An acknowledgement email arrives at the address provided.
- For a group, the confirmation lists **all** travellers.

Report the per-traveller outcome back to the user. If the success page does not
appear, the submission did **not** go through — re-check for validation errors
and the CAPTCHA answer, and do not report success.

## Reference Files

- `references/portability.md` — Capability → tool mapping for Hermes Agent,
  Claude Code, OpenClaw, and Codex CLI
- `references/ica-sgac-technical-notes.md` — Detailed Angular form interaction
  patterns, CAPTCHA extraction code, and browser automation workarounds
- `scripts/` — Bundled helper scripts referenced above (relative paths; on
  Hermes use `${HERMES_SKILL_DIR}/scripts/…`)
