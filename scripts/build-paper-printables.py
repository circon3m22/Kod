#!/usr/bin/env python3
"""Build the six-up A4 answer page and current host key."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('build-cutout-sheets.py')))
