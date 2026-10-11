#!/bin/bash
tmux kill-session -t apexmidnight 2>/dev/null && echo "Server stopped." || echo "No active server session."
