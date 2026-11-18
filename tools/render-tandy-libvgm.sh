#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 VGM2WAV OUTPUT_DIRECTORY" >&2
  exit 2
fi

renderer=$1
output_dir=$2
for input in "$output_dir"/tandy-*.vgm; do
  output=${input%.vgm}.wav
  "$renderer" --samplerate 44100 --bps 16 --loops 1 --fade 0 "$input" "$output"
done
sha256sum "$renderer"
