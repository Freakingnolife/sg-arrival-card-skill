# ICA SGAC — Technical Notes for Browser Automation

These notes use the **capability** names defined in `SKILL.md` (Click, Type,
Commit, PageJS, RunCode, ReadDoc, AskUser, SendFile). Map them to your agent's
concrete tools via `references/portability.md`. Script paths are relative to the
skill directory (on Hermes, prefix with `${HERMES_SKILL_DIR}/`).

## Angular SPA Architecture

The ICA SGAC portal (`eservices.ica.gov.sg/sgarrivalcard/`) is an Angular
single-page application. Key implications for browser automation:

### Button Clicks

A normal **Click** (CDP `Input.dispatchMouseEvent` under the hood) sometimes
fails to trigger Angular's `(click)` event bindings. The click "lands" on the
DOM element but Angular's change detection doesn't fire.

**Fix:** Run JS `.click()` via **PageJS** (see `scripts/js_click_by_text.js`):
```javascript
(function() {
  const btns = document.querySelectorAll('button');
  for (const b of btns) {
    if (b.textContent.includes('Submit SGAC')) { b.click(); return 'ok'; }
  }
})()
```

### Reactive Form Validation

Angular reactive forms (`formControlName`) track value + validity via
`FormControl.value` and `FormControl.status`. These only update when Angular's
event listeners fire — which requires real DOM events, not just property
assignment.

**What doesn't work:**
```javascript
input.value = 'something';  // Angular doesn't see this
input.dispatchEvent(new Event('input'));  // Sometimes works, sometimes doesn't
```

**What works reliably:**
1. **Click** the input ref (focuses it)
2. **Type** the value (simulates real keyboard input)
3. **Commit** by pressing Tab (triggers blur → Angular validates)

### YES/NO Toggle Buttons

Custom Angular components (`icaib_button_yn` class). Selected state is tracked
via `button_Selected` CSS class, not a native radio/checkbox.

> ⚠️ The health-declaration YES/NO buttons are official declarations. Set them
> from the traveller's **actual** answer — never blanket-click NO. The
> `scripts/set_health_no.js` helper only applies once a NO answer is confirmed.

Check state:
```javascript
document.querySelectorAll('button').forEach(b => {
  if (b.textContent.trim() === 'NO')
    console.log(b.className.includes('button_Selected'));
});
```

Set confirmed-NO buttons via **PageJS** (bundled helper — only after confirming
the answer): `scripts/set_health_no.js`

### Declaration Checkbox

On the review page, the declaration checkbox is a native `<input type="checkbox">`
but a normal **Click** on the ref may not register. JS click works — use the
bundled helper via **PageJS**, which ticks it and returns the resulting state:
`scripts/check_declaration.js`

Verify: `document.querySelector('input[type="checkbox"]').checked` → `true`

## CAPTCHA Extraction

The Security Verification dialog renders a CAPTCHA image as a base64 data URL
in an `<img>` tag inside a `[role="dialog"]` container.

### Full extraction + save pattern

Two bundled helpers do this — no inline generation needed:

1. **Extract** via **PageJS**: `scripts/extract_captcha.js` — returns
   `{total, numChunks, chunks}` (chunked so long data URLs survive the return).
2. **Reassemble + save** via **RunCode**: `scripts/save_captcha.py` — pass the
   `chunks` list to `save_captcha(chunks)`; it base64-decodes and writes the PNG
   (default `/tmp/captcha_sgac.png`).

### Sending to user

**SendFile** the CAPTCHA image back to the user **in the same conversation/DM
the request came from**, then **AskUser** for the CAPTCHA text in that same
thread. Always reply to the active conversation — do not route to a separate or
hardcoded channel.

Deliver the image **losslessly** (as a file/document, not a re-compressed inline
preview) — messaging-platform compression can blur the distorted text and make
the CAPTCHA unreadable. On Hermes this is the `[[as_document]]` directive; see
`references/portability.md` for other agents.

### Vision model limitation

A vision model (**ReadDoc**) may refuse to read CAPTCHA text due to safety
policies around "bypassing security measures." This is expected — always route
to the user.

## Page Flow Summary

```
Landing → Submit SGAC → Select Residency Type →
  Form (Traveller Info) → [Add Traveller if needed] → Next →
    Review → Check declaration → Next →
      Confirm details with user → CAPTCHA → Submit →
        Confirmation → Make Another Submission / Return to Home
```

## Timing Notes

- Can submit within a **3-day window**: arrival day plus the 2 days before it
- Date buttons show: today, tomorrow, day-after-tomorrow (arrival 0–2 days out)
- If arrival is 3 or more days out (beyond day-after-tomorrow), no date button
  appears yet — wait until the window opens
- Estimated completion: 5-7 mins per person (per ICA's own estimate)
- CAPTCHA may refresh if you take too long — don't leave the form idle
