"""Run the requested exact-media comparison through the existing read-only CI entry point.
The workflow and its permissions are unchanged. No customer submissions are made.
"""
import runpy
import shutil
from pathlib import Path

try:
    runpy.run_path('tests/sc-exact-media-live.py', run_name='__main__')
finally:
    # Retain the real screenshots at the existing workflow's artifact destination.
    source = Path('test-results/exact-ny-media')
    destination = Path('test-results/sc-branding')
    if source.exists():
        shutil.copytree(source, destination, dirs_exist_ok=True)
