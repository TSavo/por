#!/usr/bin/env bash
set -euo pipefail

source_dir=/data/persona-voice-envs/drama3_small/src
model_dir=/data/persona-models/drama3-small
commit=c7137d2c26333ba6aa12aeabb4fddfbf8e6a6e73

if [[ ! -d "$source_dir/.git" ]]; then
  git clone https://github.com/pentaCoxian/ComfyUI-drama3-small.git "$source_dir"
fi
git -C "$source_dir" fetch --depth 1 origin "$commit"
git -C "$source_dir" checkout --detach "$commit"
mkdir -p "$model_dir"

docker exec voice-stack-fish-1 python3 -c \
  'from huggingface_hub import hf_hub_download; hf_hub_download(repo_id="pentacoxian-dev/drama3-small-GGUF", filename="drama3-small-IQ3_XXS.gguf", local_dir="/models/drama3-small")'
