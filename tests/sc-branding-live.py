"""Run the requested read-only exact-media comparison; no workflow permissions change."""
import py_compile
import runpy
import shutil
from pathlib import Path

try:
    py_compile.compile('tests/sc-exact-media-live.py', doraise=True)
    runpy.run_path('tests/sc-exact-media-live.py', run_name='__main__')
finally:
    source = Path('test-results/exact-ny-media')
    destination = Path('test-results/sc-branding')
    if source.exists():
        shutil.copytree(source, destination, dirs_exist_ok=True)
