"""Freeze the original SQLite writer and save a private, verified JSON backup."""
import argparse
import json
import sys
from pathlib import Path

import httpx
from dotenv import dotenv_values

sys.path.insert(0, str(Path(__file__).resolve().parent))
from migrate_storage import digest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render-env', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise RuntimeError('Backup already exists. Refusing to overwrite it.')
    key = dotenv_values(args.render_env)['ANALYTICS_ADMIN_KEY']
    with httpx.Client(base_url='https://before-i-call.onrender.com', timeout=45,
                      headers={'Authorization': 'Bearer ' + key}) as client:
        client.post('/api/analytics/migration/freeze').raise_for_status()
        response = client.get('/api/analytics/backup')
        response.raise_for_status()
        data = response.json()
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('x', encoding='utf-8') as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
        saved = json.loads(args.output.read_text(encoding='utf-8'))
        if digest(saved['tables']) != digest(data['tables']):
            raise RuntimeError('Backup verification failed. Original disk remains frozen and intact.')
        print(json.dumps({'counts': {table: len(rows) for table, rows in saved['tables'].items()},
                          'verified_sha256': digest(saved['tables'])}))


if __name__ == '__main__':
    main()
