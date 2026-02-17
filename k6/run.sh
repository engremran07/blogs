#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# k6 Test Runner — Bash/Linux/macOS
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./k6/run.sh smoke                    # Quick smoke test
#   ./k6/run.sh load                     # Standard load test
#   ./k6/run.sh stress                   # Stress / breakpoint test
#   ./k6/run.sh soak                     # Endurance test (30 min)
#   ./k6/run.sh scenario 01-auth-flow    # Single scenario
#   ./k6/run.sh all                      # All 22 scenarios
#
# Environment overrides:
#   BASE_URL=http://staging:3000 ./k6/run.sh smoke
#   ADMIN_EMAIL=admin@prod.com ./k6/run.sh load
# ─────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-smoke}"
SCENARIO="${2:-}"

GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

run_k6() {
  local file="$1"
  local label="$2"

  echo ""
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}  Running: ${label}${NC}"
  echo -e "${GRAY}  File:    ${file}${NC}"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""

  if k6 run "$file"; then
    echo -e "\n  ${GREEN}✓ PASSED: ${label}${NC}"
    return 0
  else
    echo -e "\n  ${RED}✗ FAILED: ${label}${NC}"
    return 1
  fi
}

case "${MODE,,}" in
  smoke)
    run_k6 "$SCRIPT_DIR/suites/smoke.js" "Smoke Test"
    ;;
  load)
    run_k6 "$SCRIPT_DIR/suites/load.js" "Load Test"
    ;;
  stress)
    run_k6 "$SCRIPT_DIR/suites/stress.js" "Stress Test"
    ;;
  soak)
    run_k6 "$SCRIPT_DIR/suites/soak.js" "Soak Test"
    ;;
  scenario)
    if [ -z "$SCENARIO" ]; then
      echo "Usage: ./run.sh scenario <scenario-name>"
      echo "Available scenarios:"
      ls "$SCRIPT_DIR/scenarios/"*.js 2>/dev/null | while read -r f; do
        echo "  $(basename "$f" .js)"
      done
      exit 1
    fi
    file="$SCRIPT_DIR/scenarios/${SCENARIO}.js"
    if [ ! -f "$file" ]; then
      echo -e "${RED}Scenario not found: ${file}${NC}"
      exit 1
    fi
    run_k6 "$file" "Scenario: $SCENARIO"
    ;;
  all)
    echo -e "\n${CYAN}Running all 22 scenarios sequentially...${NC}\n"
    passed=0
    failed=0
    failed_names=()

    for f in "$SCRIPT_DIR/scenarios/"*.js; do
      name="$(basename "$f" .js)"
      if run_k6 "$f" "$name"; then
        ((passed++))
      else
        ((failed++))
        failed_names+=("$name")
      fi
      sleep 3
    done

    echo ""
    echo "╔═══════════════════════════════════════════════╗"
    echo "║           TEST SUITE RESULTS                  ║"
    echo "╠═══════════════════════════════════════════════╣"
    echo -e "║  ${GREEN}Passed: ${passed}${NC}                                    ║"
    if [ "$failed" -gt 0 ]; then
      echo -e "║  ${RED}Failed: ${failed}${NC}                                    ║"
    else
      echo -e "║  ${GREEN}Failed: 0${NC}                                    ║"
    fi
    echo "╚═══════════════════════════════════════════════╝"

    if [ "$failed" -gt 0 ]; then
      echo -e "\n${RED}Failed scenarios:${NC}"
      for name in "${failed_names[@]}"; do
        echo -e "  ${RED}✗ ${name}${NC}"
      done
      exit 1
    fi
    ;;
  *)
    echo -e "${RED}Unknown mode: ${MODE}${NC}"
    echo "Usage: ./run.sh <smoke|load|stress|soak|scenario|all> [scenario-name]"
    exit 1
    ;;
esac
