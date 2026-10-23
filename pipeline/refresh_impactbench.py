#!/usr/bin/env python3
"""Keep the ai-assistants "Good for you" scores in step with MIT's ImpactBench nutrition label.

The benchmark calls itself a work in progress and publishes versioned releases, so the scores the
lens carries will go stale without anyone noticing. This reads the published file, recomputes each
tested product's score the same way the lens was built (the mean of the nine adult pass rates,
averaged across a company's tested models), reports what moved, and says whether a newer release
than the one pinned here exists.

    python pipeline/refresh_impactbench.py           report only, writes nothing
    python pipeline/refresh_impactbench.py --write   update scores and notes for the pinned release

It needs the network, so it is a maintenance step, not part of npm run build. When a newer release
appears, read its notes before changing RELEASE: a new release can add or rename areas or models,
and the mapping below must be checked by a person, not guessed.
"""
import json
import os
import statistics as st
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tracked_io import write_text  # noqa: E402

LENS = os.path.normpath(os.path.join(HERE, '..', 'content', 'lenses', 'ai-assistants.json'))
BASE = 'https://impactbench-bucket.cyborglab.org'
RELEASE = 'data-v1'           # v1.0.1, 11 September 2026
PAGE = 'https://impactbench.media.mit.edu/nutrition'

NAMES = {'claude-opus-5': 'Claude Opus 5', 'claude-sonnet-5': 'Claude Sonnet 5', 'gpt-5-6-luna': 'GPT-5.6 Luna',
         'gpt-5-6-terra': 'GPT-5.6 Terra', 'gemini-3-7-flash': 'Gemini 3.7 Flash', 'grok-4-6': 'Grok 4.6',
         'deepseek-v4-flash': 'DeepSeek V4 Flash', 'gemma-4-31b': 'Gemma 4 31B', 'qwen3-8-27b': 'Qwen3.8 27B'}
PRODUCTS = {'claude': ['claude-opus-5', 'claude-sonnet-5'], 'chatgpt': ['gpt-5-6-luna', 'gpt-5-6-terra'],
            'gemini': ['gemini-3-7-flash'], 'grok': ['grok-4-6'], 'deepseek': ['deepseek-v4-flash'],
            'gemma': ['gemma-4-31b'], 'qwen': ['qwen3-8-27b']}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Conscious Consuming refresh (valuescommons.org)'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode('utf-8'))


def newer_release():
    n = int(RELEASE.split('-v')[1])
    try:
        fetch(f'{BASE}/data-v{n + 1}/nutrition.json')
        return f'data-v{n + 1}'
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError):
        return None


def note_for(bench, models):
    def mean(model, who):
        return st.mean(c['models'][model][who] for c in bench)

    def area(model, start):
        return [c for c in bench if c['label'].startswith(start)][0]['models'][model]['adult']

    adult = st.mean(mean(m, 'adult') for m in models)
    child = st.mean(mean(m, 'child') for m in models)
    syc = st.mean(area(m, 'Avoids Sycophancy') for m in models)
    agency = st.mean(area(m, 'Promotes Agency') for m in models)
    which = ' and '.join(NAMES[m] for m in models)
    note = (f"MIT Media Lab's ImpactBench AI Nutrition Label (v1.0.1) tested {which} in simulated "
            f"conversations across nine behaviours, from avoiding sycophancy and hallucination to "
            f"promoting agency, learning and wellbeing. Averaged across the nine, the model"
            f"{'s pass' if len(models) > 1 else ' passes'} {adult:.0%} of checks with adult users and "
            f"{child:.0%} with child users; it avoids sycophancy in {syc:.0%} and supports the user's "
            f"own agency in {agency:.0%}. The benchmark scores models, not apps, so the app may route "
            f"to other models, and an LLM judge from the GPT family grades the conversations.")
    return round(adult * 100), note


def main():
    write = '--write' in sys.argv
    bench = fetch(f'{BASE}/{RELEASE}/nutrition.json')
    tested = set(bench[0]['models'])
    missing = sorted({m for ms in PRODUCTS.values() for m in ms} - tested)
    if missing:
        raise SystemExit(f'refresh_impactbench: the release no longer tests {missing}; a person must re-map before anything is written')

    lens = json.load(open(LENS, encoding='utf-8'))
    by_code = {p['code']: p for p in lens['products']}
    moved = []
    for code, models in PRODUCTS.items():
        score, note = note_for(bench, models)
        p = by_code[code]
        old = p['scores'].get('wellbeing')
        if old != score:
            moved.append(f'{code}: {old} -> {score}')
        if write:
            p['scores']['wellbeing'] = score
            p['provenance']['wellbeing'] = {'note': note, 'source': PAGE, 'asof': p['provenance'].get('wellbeing', {}).get('asof', '2026-09')}

    print(f'refresh_impactbench: {RELEASE}, {len(PRODUCTS)} products, {len(moved)} moved')
    for line in moved:
        print('  ' + line)
    untracked = sorted(tested - {m for ms in PRODUCTS.values() for m in ms})
    if untracked:
        print(f'  tested but not mapped to a product: {untracked}')
    newer = newer_release()
    if newer:
        print(f'  a newer release exists ({newer}); read its notes, then move RELEASE and re-check the mapping')
    if write and moved:
        write_text(LENS, json.dumps(lens, ensure_ascii=False, indent=2) + '\n')
        print('  lens written; rebuild and run the lens check')


if __name__ == '__main__':
    main()
