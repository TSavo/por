#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "usage: $0 BUILD_DIRECTORY" >&2
  exit 2
fi

build_root=$1
source_dir="$build_root/source"
build_dir="$build_root/build"
mkdir -p "$build_root"
if [[ ! -d "$source_dir/.git" ]]; then
  git clone --depth 1 https://github.com/ValleyBell/libvgm.git "$source_dir"
fi
cmake -S "$source_dir" -B "$build_dir" -DBUILD_PLAYER=OFF -DBUILD_VGM2WAV=ON
cmake --build "$build_dir" --parallel 2
find "$build_dir" -type f -name 'vgm2wav*' -perm -u+x -print -quit
