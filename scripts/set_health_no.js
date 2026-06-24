// Set health-declaration toggles to NO and report the resulting state.
//
// ⚠️ ONLY run this once you have CONFIRMED the traveller's real answer is NO.
// The health questions are official declarations — never blanket-answer NO.
// For a YES answer, click the YES toggle manually and fill any follow-up fields.
//
// Angular custom toggles track selection via the `button_Selected` CSS class.
(function () {
  var clicked = 0;
  document.querySelectorAll('button').forEach(function (b) {
    if (b.textContent.trim() === 'NO' && !b.className.includes('button_Selected')) {
      b.click();
      clicked++;
    }
  });
  var selected = 0;
  document.querySelectorAll('button').forEach(function (b) {
    if (b.textContent.trim() === 'NO' && b.className.includes('button_Selected')) {
      selected++;
    }
  });
  return JSON.stringify({ clicked: clicked, no_selected: selected });
})();
