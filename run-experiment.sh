#!/bin/bash
set -e

TASK=${1:?Usage: ./run-experiment.sh <task-name> [variant] [runs] [model] [max-turns]}
VARIANT=${2:-all}
RUNS=${3:-3}
MODEL=${4:-sonnet}
MAX_TURNS=${5:-30}
RESULTS_DIR="results/${TASK}/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$RESULTS_DIR"

# Determine which variants to test
if [ "$VARIANT" = "all" ]; then
  VARIANTS=(variant-1-flat variant-2-structured variant-3-multi-light variant-4-multi-arch variant-5-hexagonal)
else
  VARIANTS=("$VARIANT")
fi

PROMPT=$(cat "tasks/${TASK}.prompt.md")

echo "=== Experiment: $TASK ==="
echo "Model: $MODEL"
echo "Variants: ${VARIANTS[*]}"
echo "Runs per variant: $RUNS"
echo "Results: $RESULTS_DIR"
echo ""

for V in "${VARIANTS[@]}"; do
  echo "========================================"
  echo "Variant: $V"
  echo "========================================"

  for RUN in $(seq 1 "$RUNS"); do
    echo ""
    echo "--- $V run $RUN/$RUNS ---"

    # Reset to baseline
    git checkout .
    # Clean any new files the agent might have created in the variant
    git clean -fd "$V/" 2>/dev/null || true

    # Pick a port that won't collide
    PORT=$((3100 + RANDOM % 900))

    # Run the agent
    AGENT_RESULT=$(cd "$V" && claude -p "$PROMPT" \
      --output-format json \
      --model "$MODEL" \
      --allowedTools "Read Edit Write Glob Grep Bash" \
      --max-turns "$MAX_TURNS" \
      --dangerously-skip-permissions \
      2>/dev/null) || true

    # Save agent output
    echo "$AGENT_RESULT" > "$RESULTS_DIR/${V}_run${RUN}_agent.json"

    # Capture git diff stats
    GIT_DIFF_STAT=$(git diff --stat "$V/")
    GIT_FILES_CHANGED=$(git diff --name-only "$V/" | wc -l | tr -d ' ')
    GIT_LINES_ADDED=$(git diff --numstat "$V/" | awk '{s+=$1} END {print s+0}')
    GIT_LINES_REMOVED=$(git diff --numstat "$V/" | awk '{s+=$1} END {print s+0}')
    # Also capture new files
    GIT_NEW_FILES=$(git ls-files --others --exclude-standard "$V/" | wc -l | tr -d ' ')

    # Run baseline tests
    BASELINE_PASS=false
    if ./run-tests.sh "$V" "$PORT" 2>&1 | tail -1 | grep -q "PASS"; then
      BASELINE_PASS=true
    fi

    # Run task tests
    TASK_PASS=false
    if ./run-tests.sh "$V" "$PORT" "$TASK" 2>&1 | tail -1 | grep -q "PASS"; then
      TASK_PASS=true
    fi

    # Extract metrics from agent JSON
    NUM_TURNS=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('num_turns',0))" 2>/dev/null || echo "0")
    INPUT_TOKENS=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('usage',{}).get('input_tokens',0))" 2>/dev/null || echo "0")
    OUTPUT_TOKENS=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('usage',{}).get('output_tokens',0))" 2>/dev/null || echo "0")
    CACHE_READ=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('usage',{}).get('cache_read_input_tokens',0))" 2>/dev/null || echo "0")
    CACHE_CREATE=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('usage',{}).get('cache_creation_input_tokens',0))" 2>/dev/null || echo "0")
    TOTAL_COST=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('total_cost_usd',0))" 2>/dev/null || echo "0")
    DURATION_MS=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('duration_ms',0))" 2>/dev/null || echo "0")
    IS_ERROR=$(echo "$AGENT_RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(str(d.get('is_error',True)).lower())" 2>/dev/null || echo "true")

    # Write summary row
    SUMMARY="$RESULTS_DIR/${V}_run${RUN}_summary.json"
    cat > "$SUMMARY" << ENDJSON
{
  "variant": "$V",
  "task": "$TASK",
  "run": $RUN,
  "model": "$MODEL",
  "num_turns": $NUM_TURNS,
  "input_tokens": $INPUT_TOKENS,
  "output_tokens": $OUTPUT_TOKENS,
  "cache_read_input_tokens": $CACHE_READ,
  "cache_creation_input_tokens": $CACHE_CREATE,
  "total_cost_usd": $TOTAL_COST,
  "duration_ms": $DURATION_MS,
  "is_error": $IS_ERROR,
  "baseline_tests_pass": $BASELINE_PASS,
  "task_tests_pass": $TASK_PASS,
  "files_changed": $GIT_FILES_CHANGED,
  "new_files": $GIT_NEW_FILES,
  "lines_added": $GIT_LINES_ADDED
}
ENDJSON

    echo "  turns=$NUM_TURNS cost=\$$TOTAL_COST duration=${DURATION_MS}ms"
    echo "  files_changed=$GIT_FILES_CHANGED baseline=$BASELINE_PASS task=$TASK_PASS"
  done
done

# Generate CSV summary
echo ""
echo "=== Generating summary ==="
CSV="$RESULTS_DIR/summary.csv"
echo "variant,run,num_turns,input_tokens,output_tokens,cache_read,cache_create,cost_usd,duration_ms,is_error,baseline_pass,task_pass,files_changed,new_files,lines_added" > "$CSV"

for f in "$RESULTS_DIR"/*_summary.json; do
  python3 -c "
import json, sys
d = json.load(open('$f'))
print(','.join(str(x) for x in [
    d['variant'], d['run'], d['num_turns'],
    d['input_tokens'], d['output_tokens'],
    d['cache_read_input_tokens'], d['cache_creation_input_tokens'],
    d['total_cost_usd'], d['duration_ms'], d['is_error'],
    d['baseline_tests_pass'], d['task_tests_pass'],
    d['files_changed'], d['new_files'], d['lines_added']
]))
" >> "$CSV"
done

echo "Results saved to: $RESULTS_DIR"
echo "CSV summary: $CSV"
echo ""
cat "$CSV" | column -t -s,
