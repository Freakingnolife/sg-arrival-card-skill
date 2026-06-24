// Click an Angular button by its visible text, for when browser_click does not
// fire the (click) binding. Paste into browser_console; edit TARGET_TEXT first.
// Works for: "Submit SGAC", a residency-type button, "Add Traveller", "Next".
(function () {
  var TARGET_TEXT = 'Submit SGAC';
  var btns = document.querySelectorAll('button');
  for (var i = 0; i < btns.length; i++) {
    if (btns[i].textContent.includes(TARGET_TEXT)) {
      btns[i].click();
      return 'clicked: ' + TARGET_TEXT;
    }
  }
  return 'not found: ' + TARGET_TEXT;
})();
