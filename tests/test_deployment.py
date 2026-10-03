"""Start the backend with only files copied into Docker's runtime stage."""
import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest


class DeploymentTests(unittest.TestCase):
    def test_runtime_image_files_support_backend_startup(self):
        root = Path(__file__).resolve().parents[1]
        runtime_stage = (root / 'Dockerfile').read_text(encoding='utf-8').rsplit('FROM ', 1)[1]
        with tempfile.TemporaryDirectory() as directory:
            destination_root = Path(directory)
            for line in runtime_stage.splitlines():
                if not line.startswith('COPY ') or '--from=' in line:
                    continue
                *sources, destination = shlex.split(line)[1:]
                target = destination_root / destination.removeprefix('./')
                for source in sources:
                    path = root / source
                    if path.is_dir():
                        shutil.copytree(path, target, ignore=shutil.ignore_patterns('__pycache__'))
                    else:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        if destination.endswith('/'):
                            target.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(path, target)
            environment = os.environ.copy()
            environment.pop('PYTHONPATH', None)
            environment['ANALYTICS_DB_PATH'] = str(destination_root / 'analytics.sqlite3')
            result = subprocess.run(
                [sys.executable, '-c', "from uvicorn import Config; config = Config('server.app:app'); config.load(); from server.app import demo_turns; assert len(demo_turns) == 10; print('Runtime backend startup verified')"],
                cwd=destination_root, env=environment, capture_output=True, text=True, timeout=30,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
