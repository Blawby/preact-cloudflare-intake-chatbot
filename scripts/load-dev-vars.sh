#!/bin/bash
# Load .dev.vars file and export all variables
set -a
source .dev.vars
set +a
exec "$@"
