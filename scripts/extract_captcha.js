// Extract the CAPTCHA image data URL from the Security Verification dialog,
// chunked so a long data URL survives a single browser_console return value.
// Feed the returned `chunks` array to scripts/save_captcha.py.
(function () {
  var d = document.querySelector('[role="dialog"]');
  var img = d ? d.querySelector('img') : null;
  if (!img) return JSON.stringify({ error: 'no image' });
  var src = img.src;
  var chunkSize = 2000;
  var chunks = [];
  for (var i = 0; i < src.length; i += chunkSize) {
    chunks.push(src.substring(i, i + chunkSize));
  }
  return JSON.stringify({ total: src.length, numChunks: chunks.length, chunks: chunks });
})();
