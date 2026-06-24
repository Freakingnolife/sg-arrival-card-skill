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

Check state:
```javascript
document.querySelectorAll('button').forEach(b => {
  if (b.textContent.trim() === 'NO')
    console.log(b.className.includes('button_Selected'));
});
```

Click all unselected NO buttons:
```javascript
(function() {
  let count = 0;
  document.querySelectorAll('button').forEach(b => {
    if (b.textContent.trim() === 'NO' && !b.className.includes('button_Selected')) {
      b.click(); count++;
    }
  });
  return count + ' clicked';
})()
```

### Declaration Checkbox

On the review page, the declaration checkbox is a native `<input type="checkbox">`
but `browser_click` on the ref may not register. JS click works:
```javascript
document.querySelector('input[type="checkbox"]').click();
```

Verify: `document.querySelector('input[type="checkbox"]').checked` → `true`

## CAPTCHA Extraction

The Security Verification dialog renders a CAPTCHA image as a base64 data URL
in an `<img>` tag inside a `[role="dialog"]` container.

### Full extraction + save pattern

```python
# In execute_code — extract base64 from browser_console, then save
import base64

# Step 1: Get chunks via browser_console (data URLs can be long)
# browser_console expression:
# (function() {
#   const d = document.querySelector('[role="dialog"]');
#   const img = d?.querySelector('img');
#   if (!img) return JSON.stringify({error: 'no image'});
#   const src = img.src;
#   const chunkSize = 2000;
#   const chunks = [];
#   for (let i = 0; i < src.length; i += chunkSize)
#     chunks.push(src.substring(i, i + chunkSize));
#   return JSON.stringify({total: src.length, numChunks: chunks.length, chunks: chunks});
# })()

# Step 2: Reassemble and save (in execute_code)
# data_url = 'data:image/png;base64,' + ''.join(chunks)
# b64_data = data_url.split(',')[1]
# with open('/tmp/captcha_sgac.png', 'wb') as f:
#     f.write(base64.b64decode(b64_data))
```

### Sending to user

Send the CAPTCHA image back to the user **in the same conversation/DM the
request came from** via `send_message` with `MEDIA:<path>`, then use `clarify`
to ask for the CAPTCHA text in that same thread. Always reply to the active
conversation — do not route to a separate or hardcoded channel.

### Vision model limitation

`vision_analyze` may refuse to read CAPTCHA text due to safety policies around
"bypassing security measures." This is expected — always route to the user.

## Page Flow Summary

```
Landing → Submit SGAC → Select Residency Type →
  Form (Traveller Info) → [Add Traveller if needed] → Next →
    Review → Check declaration → Next →
      CAPTCHA → Submit →
        Confirmation → Make Another Submission / Return to Home
```

## Timing Notes

- Can submit within a **3-day window**: arrival day plus the 2 days before it
- Date buttons show: today, tomorrow, day-after-tomorrow (arrival 0–2 days out)
- If arrival is 3 or more days out (beyond day-after-tomorrow), no date button
  appears yet — wait until the window opens
- Estimated completion: 5-7 mins per person (per ICA's own estimate)
- CAPTCHA may refresh if you take too long — don't leave the form idle
