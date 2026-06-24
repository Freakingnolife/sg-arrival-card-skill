---
name: sg-arrival-card
description: Submit Singapore Arrival Cards (SGAC) via the ICA e-services portal. Covers SC/PR, Long-Term Pass Holder, and Foreign Visitor pathways, Angular form quirks, CAPTCHA handling, and group submissions.
platforms: [linux]
---

# SG Arrival Card (SGAC) Submission

Use this skill when submitting Singapore Arrival Cards for travellers
returning to Singapore by air. The ICA portal at
`https://eservices.ica.gov.sg/sgarrivalcard/` is an Angular SPA with specific
browser-automation quirks.

## When This Applies

- Travellers returning to Singapore from overseas
- Can submit within a **3-day window**: the arrival day plus the 2 days before
  it (i.e. arrival is 0–2 days out)
- Required for: SC citizens, PRs, LTVP holders, foreign visitors — everyone
  except transit passengers who don't pass immigration

## Traveller Documents

Store passport and LTVP details in a local data file (e.g.
`data/traveller_documents.md`). Key identifiers needed per person:

| Pathway | ID Field | Format | Source |
|---------|----------|--------|--------|
| SC/PR | NRIC | S/T + 7 digits + letter | Singapore passport (bottom section, "National ID No") |
| LTVP/DP/EP/SP | FIN | G/F/M + 7 digits + letter | LTVP/pass card (front side, top-right) |
| Foreign Visitor | Passport No | Varies | Passport bio page |

> When a new traveller needs SGAC, ask for their passport/NRIC and add to the
> data file. Users may send passport photos — use `vision_analyze` to extract
> details.

## Submission Workflow

### Step 1 — Determine pathway

- **Singapore Citizen / PR** → "Singapore Citizen / Permanent Resident" button.
  Requires **NRIC**.
- **LTVP / DP / EP / SP etc.** → "Long-Term Pass Holder" button. Requires
  **FIN**.
- **Foreign visitor (no LTVP)** → "Foreign Visitor / IPA Holder" button.
  Requires passport number + nationality.

### Step 2 — Navigate to the form

1. Go to `https://eservices.ica.gov.sg/sgarrivalcard/`
2. Click **"Submit SGAC"** — ⚠️ `browser_click` may not work on this Angular
   button. If the page doesn't change, use JS click via `browser_console`:
   ```javascript
   (function() {
     const btns = document.querySelectorAll('button');
     for (const b of btns) {
       if (b.textContent.includes('Submit SGAC')) { b.click(); return 'ok'; }
     }
   })()
   ```
3. Select the appropriate residency type button. Same JS-click fallback applies.

### Step 3 — Fill the traveller information form

**CRITICAL — Angular reactive forms require proper interaction sequence.**
Setting `.value` via JS does NOT trigger Angular's form validation. You MUST:

1. **Click** the input field (focuses it)
2. **Type** the value via `browser_type`
3. **Press Tab** via `browser_press` (triggers blur → Angular validates)

If you skip the Tab press, Angular may not register the value and you'll get
"Please fill in the field above" errors on fields that visibly contain text.

#### Fields (SC/PR pathway):
- **Date of Arrival** — 3 button options (today, tomorrow, day-after). Click
  the correct date button.
- **NRIC** — text input
- **Name** — text input (FULL CAPS as on passport)
- **Date of Birth** — text input, DD/MM/YYYY format
- **Email Address** — text input (contact email for confirmation)
- **Health Declaration Q1** — "Do you have fever, cough...?" → click NO
- **Health Declaration Q2** — "Visited yellow fever countries in past 6 days?"
  → click NO (this question appears AFTER selecting Q1)

#### Fields (LTVP pathway):
Same as above but **FIN** instead of NRIC.

#### YES/NO buttons:
These are custom Angular toggle buttons, not standard radio buttons. Click
via `browser_click` or JS. Verify selection by checking for `button_Selected`
class:
```javascript
document.querySelectorAll('button').forEach(b => {
  if (b.textContent.trim() === 'NO')
    console.log(b.className.includes('button_Selected'));
});
```

### Step 4 — Add additional travellers (group submission)

**USE GROUP SUBMISSION whenever multiple travellers share the same pathway.**
This is the preferred approach — one submission, one CAPTCHA, one confirmation
email covering all travellers. Do NOT submit individually unless group fails.

The **"Add Traveller | +"** button adds a new traveller section below the
current one. All travellers share the same arrival date.

**Group submission workflow:**
1. Fill Lead Traveller completely (all fields + health declarations)
2. Ensure ALL fields pass validation (no "Please fill in the field above" errors)
3. Click **"Add Traveller | +"** — a new traveller section appears
4. Fill the new traveller: ID, Name, DOB, Email, Health Declarations (same fields
   except Date of Arrival is shared)
5. Repeat for each additional traveller
6. Click Next → Review page shows ALL travellers
7. One CAPTCHA, one confirmation for the entire group

**If Add Traveller doesn't seem to work:**
- Check for hidden validation errors on existing fields (email field is the
  usual culprit — re-type and press Tab)
- Try clicking Add Traveller via JS:
  ```javascript
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent.includes('Add Traveller')) b.click();
  });
  ```
- As a last resort, submit individually via "Make Another Submission"

### Cross-pathway submissions

When travellers are on **different pathways** (e.g. one is SC, another is
LTVP), they **cannot** be combined in a single submission. Each pathway is a
separate form with different fields (NRIC vs FIN). Submit each pathway group
separately:

1. Complete all SC/PR travellers first
2. Start a new submission for LTVP travellers
3. Start a new submission for foreign visitors if needed

### Step 5 — Review page

1. Verify all details are correct
2. **Check the declaration checkbox** — ⚠️ `browser_click` on the checkbox ref
   may not work. Use JS:
   ```javascript
   document.querySelector('input[type="checkbox"]').click();
   ```
3. Click **Next**

### Step 6 — CAPTCHA (Security Verification)

A modal dialog appears with a distorted-text CAPTCHA image. The vision model
may refuse to read CAPTCHAs (safety policy).

**Workflow:**
1. Extract the CAPTCHA image as base64 via `browser_console`:
   ```javascript
   (function() {
     const d = document.querySelector('[role="dialog"]');
     const img = d?.querySelector('img');
     if (!img) return 'no image';
     return img.src;
   })()
   ```
   > If the full data URL is too long for one return, split into chunks and
   > reassemble in `execute_code`.
2. Save to a PNG file using `execute_code` (base64 decode)
3. Send the image to the user via `send_message` with `MEDIA:<path>`
4. Ask the user to read the CAPTCHA text via `clarify`
5. Type the answer into the captcha input and click Submit

**Alternative:** Use the "Play Audio" button for an audio CAPTCHA if the text
is unreadable.

### Step 7 — Confirmation

Success page shows "Your Singapore Arrival Card submission is successful!"
- Acknowledgement email sent to the provided email address
- Options: Print, Download PDF, Submit Cash Declaration, Submit Customs
  Declaration
- Click "Make Another Submission" to continue with the next pathway group

## Pitfalls

- ❌ **Do NOT use `browser_click` on Angular buttons that don't respond** —
  switch to JS `.click()` via `browser_console`.
- ❌ **Do NOT set input values via JS `.value =`** — Angular reactive forms
  won't validate. Always use click → type → Tab.
- ❌ **Do NOT skip the Tab key after typing** — without blur, Angular doesn't
  update the form control's validity state.
- ❌ **Do NOT try to read the CAPTCHA with vision_analyze** — the vision model
  may refuse CAPTCHA reading due to safety policies. Send to the user instead.
- ✅ **Always try group submission first** when multiple travellers share the
  same pathway — use "Add Traveller | +" to add them all in one submission.
- ✅ **Always verify YES/NO buttons are selected** before clicking Next.
- ✅ **Save passport/LTVP details** to a data file after first extraction so
  future submissions don't require re-reading the documents.

## Reference Files

- `references/ica-sgac-technical-notes.md` — Detailed Angular form interaction
  patterns, CAPTCHA extraction code, and browser automation workarounds
