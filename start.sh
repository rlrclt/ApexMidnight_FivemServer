#!/bin/bash
PROJECT_DIR="/home/rlrclt/ApexMidmighr-FivemProjetc"
DATA_DIR="$PROJECT_DIR/server-data"
RUN_SH="$PROJECT_DIR/alpine/run.sh"

export TZ="Asia/Bangkok"
/usr/local/bin/ensure_tailscale.sh 2>/dev/null || true
cd "$DATA_DIR" || exit 1
echo "Starting ApexMidnight FiveM Server with txAdmin..."
exec "$RUN_SH" +set txAdminPort 40120 +set serverProfile "apexmidnight" "$@"
