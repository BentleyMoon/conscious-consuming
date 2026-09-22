#!/usr/bin/env python3
"""LF-stable writers for tracked text produced by pipeline scripts."""
import json
import time

# The dataset builder writes about 130 large JSON files back to back, and on Windows that outruns
# whatever scans each one as it closes: the open of the next file comes back EINVAL. Observed on
# 2026-08-15, moving between files across runs, which is what rules out a problem with any single
# file. Retry briefly rather than guess at which watcher is holding it; a genuine permission
# problem still raises, because the last attempt is not caught.
OPEN_ATTEMPTS = 5
OPEN_BACKOFF = 0.3


def open_text(path, mode='w'):
    """Open tracked UTF-8 text without platform newline translation."""
    for attempt in range(OPEN_ATTEMPTS - 1):
        try:
            return open(path, mode, encoding='utf-8', newline='\n')
        except OSError:
            time.sleep(OPEN_BACKOFF * (attempt + 1))
    return open(path, mode, encoding='utf-8', newline='\n')


def write_text(path, content):
    with open_text(path) as handle:
        handle.write(content)


def write_json(path, value, **kwargs):
    with open_text(path) as handle:
        json.dump(value, handle, **kwargs)
