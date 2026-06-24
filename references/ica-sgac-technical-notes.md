# ICA SGAC — Technical Notes for Browser Automation

## Angular SPA Architecture

The ICA SGAC portal (`eservices.ica.gov.sg/sgarrivalcard/`) is an Angular
single-page application. Key implications for browser automation:

### Button Clicks

Standard `browser_click` (CDP `Input.dispatchMouseEvent`) sometimes fails to
trigger Angular's `(click)` event bindings. The click "lands" on the DOM
element but Angular's change detection doesn't fire.

**Fix:** Use JS `.click()` via `browser_console`:
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
1. `browser_click` on the input ref (focuses it)
2. `browser_type` the value (simulates real keyboard input)
3. `browser_press` Tab key (triggers blur → Angular validates)

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

Set confirmed-NO buttons (bundled helper — only after confirming the answer):
`${HERMES_SKILL_DIR}/scripts/set_health_no.js`

### Declaration Checkbox

On the review page, the declaration checkbox is a native `<input type="checkbox">`
but `browser_click` on the ref may not register. JS click works — use the
bundled helper, which ticks it and returns the resulting state:
`${HERMES_SKILL_DIR}/scripts/check_declaration.js`

Verify: `document.querySelector('input[type="checkbox"]').checked` → `true`

## CAPTCHA Extraction

The Security Verification dialog renders a CAPTCHA image as a base64 data URL
in an `<img>` tag inside a `[role="dialog"]` container.

### Full extraction + save pattern

Two bundled helpers do this — no inline generation needed:

1. **Extract** via `browser_console`:
   `${HERMES_SKILL_DIR}/scripts/extract_captcha.js` — returns
   `{total, numChunks, chunks}` (chunked so long data URLs survive the return).
2. **Reassemble + save** via `execute_code`:
   `${HERMES_SKILL_DIR}/scripts/save_captcha.py` — pass the `chunks` list to
   `save_captcha(chunks)`; it base64-decodes and writes the PNG (default
   `/tmp/captcha_sgac.png`).

### Sending to user

Send the CAPTCHA image back to the user **in the same conversation/DM the
request came from** via `send_message` with `MEDIA:<path>`, then use `clarify`
to ask for the CAPTCHA text in that same thread. Always reply to the active
conversation — do not route to a separate or hardcoded channel.

Use the `[[as_document]]` directive when sending the image so it is delivered
**losslessly** — messaging-platform compression can blur the distorted text and
make the CAPTCHA unreadable.

### Vision model limitation

`vision_analyze` may refuse to read CAPTCHA text due to safety policies around
"bypassing security measures." This is expected — always route to the user.

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
