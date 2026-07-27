#!/usr/bin/env python3
"""LF-stable writers for tracked text produced by pipeline scripts."""
import json


def open_text(path, mode='w'):
    """Open tracked UTF-8 text without platform newline translation."""
    return open(path, mode, encoding='utf-8', newline='\n')


def write_text(path, content):
    with open_text(path) as handle:
        handle.write(content)


def write_json(path, value, **kwargs):
    with open_text(path) as handle:
        json.dump(value, handle, **kwargs)
