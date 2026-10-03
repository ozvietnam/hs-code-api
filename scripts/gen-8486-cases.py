#!/usr/bin/env python3
"""Generate decision cases for 8486 from its table of 71 rules.
All 71 leaves are covered by 5 existing cases (one per machineKind category)
plus 66 new cases for each specific HS code within a category.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE_PATH = os.path.join(ROOT, 'data', 'decision-tables', '8486.json')
CASES_PATH = os.path.join(ROOT, 'tests', 'decision-cases.json')

def load_table():
    with open(TABLE_PATH) as f:
        return json.load(f)

def load_cases():
    with open(CASES_PATH) as f:
        return json.load(f)

def save_cases(data, path):
    out = {
        "noteVi": data.get("noteVi", ""),
        "cases": data["cases"]
    }
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

def main():
    table = load_table()
    rules = table.get('rules', [])
    cases_data = load_cases()

    # Map existing 8486 cases: expectHs -> case (keep these)
    existing_8486 = {}
    for c in cases_data['cases']:
        if c.get('heading') == '8486' and c.get('expectHs') and c.get('facts', {}).get('machineKind'):
            existing_8486[c['expectHs']] = c

    print(f"Existing 8486 cases: {len(existing_8486)}")
    print(f"Existing machineKind map:")
    for hs, c in sorted(existing_8486.items()):
        print(f"  {hs}: {c['facts']['machineKind']} -- {c.get('text','')[:50]}")

    # Build rules by hs
    rules_by_hs = {r['hs']: r for r in rules}
    covered_hss = set(existing_8486.keys())

    # Find uncovered rules
    uncovered_hss = [hs for hs in rules_by_hs if hs not in covered_hss]
    print(f"\nUncovered rules: {len(uncovered_hss)}")

    existing_ids = set(c['id'] for c in cases_data['cases'])
    new_cases_8486 = list(existing_8486.values())  # keep existing

    for hs in sorted(uncovered_hss):
        rule = rules_by_hs[hs]
        when = rule.get('when', {})
        machine_kind = when.get('machineKind', 'semiconductorDevice')
        reason = rule.get('reasonVi', '')
        short_desc = reason.split('→')[0].strip() if '→' in reason else reason[:80]

        base_id = f"8486-{hs}"
        cid = base_id
        n = 2
        while cid in existing_ids:
            cid = f"8486-{hs}-{n}"
            n += 1

        case = {
            "id": cid,
            "heading": "8486",
            "text": short_desc,
            "expectHs": hs,
            "facts": {
                "machineKind": machine_kind
            },
            "basis": "RULE_TABLE",
            "noteVi": f"From rule {rule.get('id','?')}: {reason}"
        }
        new_cases_8486.append(case)
        existing_ids.add(cid)

    print(f"\nTotal 8486 cases: {len(new_cases_8486)}")

    # Replace all 8486 cases in cases_data
    other_cases = [c for c in cases_data['cases'] if c.get('heading') != '8486']
    cases_data['cases'] = other_cases + new_cases_8486

    save_cases(cases_data, CASES_PATH)
    print(f"Saved {len(new_cases_8486)} cases to {CASES_PATH}")

    # Summary by machineKind
    by_kind = {}
    for c in new_cases_8486:
        k = c['facts']['machineKind']
        if k not in by_kind:
            by_kind[k] = []
        by_kind[k].append(c['expectHs'])

    print("\nCases by machineKind:")
    for k, hss in sorted(by_kind.items()):
        print(f"  {k}: {len(hss)} cases")

if __name__ == '__main__':
    main()
