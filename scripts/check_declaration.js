// Tick the declaration checkbox on the review page. JS click registers when
// browser_click on the ref does not. Returns the resulting checked state.
(function () {
  var cb = document.querySelector('input[type="checkbox"]');
  if (!cb) return JSON.stringify({ error: 'no checkbox' });
  if (!cb.checked) cb.click();
  return JSON.stringify({ checked: cb.checked });
})();
