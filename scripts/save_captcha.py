#!/usr/bin/env python3
"""Reassemble the chunked CAPTCHA data URL and save it as a PNG.

Run inside execute_code. Pass the ``chunks`` list returned by
scripts/extract_captcha.js. Standard library only — no external dependencies.
"""

import base64

OUT_PATH = "/tmp/captcha_sgac.png"


def save_captcha(chunks, out_path=OUT_PATH):
    """Join data-URL chunks, base64-decode the payload, write a PNG."""
    data_url = "".join(chunks)
    b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
    with open(out_path, "wb") as handle:
        handle.write(base64.b64decode(b64))
    return out_path


if __name__ == "__main__":
    # Populate `chunks` from the extract_captcha.js output, then run.
    chunks = []
    print(save_captcha(chunks))
