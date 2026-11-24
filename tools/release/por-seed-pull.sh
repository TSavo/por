#!/usr/bin/env bash
# Canonical copy of Lemon's ~/por-seed/pull.sh. Keep the seedbox script in sync with this file.
# Seed new public TSavo/por GitHub releases from Lemon.
# No tokens, no credentials. Polls the public GitHub API only.
# Expects single-file Special Edition assets in the default save path:
#   Pool-of-Radiance-Special-Edition-<ver>-{mac-arm64.dmg,mac-x64.dmg,linux-x64.tar.gz,windows.zip}
#   Pool-of-Radiance-Special-Edition-v<ver>-repo.zip
# A tag's repo zip is built once, pinned to that tag, and never rebuilt.
# Does not build git bundles and does not use per-platform folders.
set -euo pipefail

SEED_DIR="${HOME}/por-seed"
STATE_DIR="${SEED_DIR}/seen"
LOCK="${SEED_DIR}/pull.lock"
WATCH_DIR="${HOME}/qBittorrent-watch"
SAVE_DIR="${HOME}/Downloads"
API_URL="https://api.github.com/repos/TSavo/por/releases"
USER_AGENT="por-seed-lemon/1.2 (+https://github.com/TSavo/por)"
PER_PAGE=30
MIN_REMAINING=5

log() {
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*" >&2
}

need_cmds() {
  local cmd
  for cmd in curl python3 sha256sum mkdir mv chmod flock git zip; do
    command -v "$cmd" >/dev/null || { log "error: missing $cmd"; exit 1; }
  done
}

rate_limited() {
  local remaining="$1" reset="$2"
  if [[ -z "$remaining" || "$remaining" == "unknown" ]]; then
    return 1
  fi
  if (( remaining < MIN_REMAINING )); then
    local reset_human="$reset"
    if [[ "$reset" =~ ^[0-9]+$ ]]; then
      reset_human="$(date -d "@$reset" '+%Y-%m-%dT%H:%M:%S%z' 2>/dev/null || echo "$reset")"
    fi
    log "rate-limit low (remaining=${remaining}); backing off until ${reset_human}"
    return 0
  fi
  return 1
}

fetch_releases() {
  local headers body status remaining reset
  headers="$(mktemp "${TMPDIR:-/tmp}/por-seed-headers.XXXXXX")"
  body="$(mktemp "${TMPDIR:-/tmp}/por-seed-body.XXXXXX")"
  status="$(curl -sS -A "$USER_AGENT" \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    -D "$headers" -o "$body" -w '%{http_code}' \
    --retry 3 --retry-delay 2 --max-time 60 \
    "${API_URL}?per_page=${PER_PAGE}")" || {
    log "error: curl failed talking to GitHub API"
    rm -f "$headers" "$body"
    return 1
  }
  remaining="$(awk -F': ' 'tolower($1)=="x-ratelimit-remaining"{gsub("\r","",$2); print $2}' "$headers" | tail -1)"
  reset="$(awk -F': ' 'tolower($1)=="x-ratelimit-reset"{gsub("\r","",$2); print $2}' "$headers" | tail -1)"
  log "api status=${status} rate-limit remaining=${remaining:-unknown} reset=${reset:-unknown}"
  if rate_limited "${remaining:-unknown}" "${reset:-unknown}"; then
    rm -f "$headers" "$body"
    return 2
  fi
  if [[ "$status" == "404" ]]; then
    log "repository or releases not visible unauthenticated (HTTP 404). Nothing to do."
    rm -f "$headers" "$body"
    return 3
  fi
  if [[ "$status" != "200" ]]; then
    log "error: unexpected API status ${status}: $(head -c 300 "$body" | tr '\n' ' ')"
    rm -f "$headers" "$body"
    return 1
  fi
  cat "$body"
  rm -f "$headers" "$body"
  return 0
}

download_file() {
  local url="$1" dest="$2"
  local tmp="${dest}.part"
  mkdir -p "$(dirname "$dest")"
  if ! curl -sS -L -A "$USER_AGENT" --retry 3 --retry-delay 2 --fail --max-time 0 -o "$tmp" "$url"; then
    rm -f "$tmp"
    log "error: download failed: $url"
    return 1
  fi
  mv -f "$tmp" "$dest"
}

sha256_of() { sha256sum "$1" | awk '{print $1}'; }

classify_asset() {
  local name="$1"
  case "$name" in
    *.torrent) echo torrent ;;
    SHA256SUMS|SHA256SUMS.txt) echo sums ;;
    *mac-arm64.dmg|*mac-x64.dmg|*linux-x64.tar.gz|*windows.zip) echo payload ;;
    *repo.zip) echo repo_zip ;;
    *.bundle|*windows-setup.exe) echo skip ;;
    *.zip|*.tar.gz) echo skip ;;
    *) echo skip ;;
  esac
}

state_file() { echo "${STATE_DIR}/$1"; }
already_done() { local f; f="$(state_file "$1")"; [[ -f "$f" ]] && grep -qx 'done' "$f"; }
mark_done() { printf 'done\n%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" > "$(state_file "$1")"; }

asset_in_sums() {
  local sums="$1" file="$2" expected actual
  [[ -f "$sums" ]] || return 0
  expected="$(awk -v f="$(basename "$file")" '$2==f {print $1; exit}' "$sums")"
  [[ -z "$expected" ]] && return 0
  actual="$(sha256_of "$file")"
  if [[ "$actual" != "$expected" ]]; then
    log "error: sha256 mismatch for $(basename "$file"): expected ${expected} got ${actual}"
    return 1
  fi
  return 0
}

# Build a tag-pinned repo zip ONCE. Never overwrites an existing zip for that tag.
# Clone is --branch "$tag" --single-branch so HEAD is the tag and later main is not included.
ensure_repo_zip() {
  local tag="$1" dest="$2"
  if [[ -f "$dest" ]]; then
    log "${tag}: repo zip already present; leaving it untouched"
    return 0
  fi
  if ! command -v git >/dev/null || ! command -v zip >/dev/null; then
    log "error: ${tag}: no repo zip on the release and git/zip are not installed"
    return 1
  fi
  local folder_name
  folder_name="$(basename "$dest" .zip)"
  local work_root="${SEED_DIR}/zip-src"
  local work_dir="${work_root}/${folder_name}"
  mkdir -p "$work_root"
  rm -rf "$work_dir"
  log "${tag}: building repo zip pinned to tag ${tag}"
  git clone --branch "$tag" --single-branch https://github.com/TSavo/por.git "$work_dir"
  local head tag_commit
  head="$(git -C "$work_dir" rev-parse HEAD)"
  tag_commit="$(git -C "$work_dir" rev-parse "${tag}^{commit}")"
  if [[ "$head" != "$tag_commit" ]]; then
    log "error: ${tag}: clone HEAD ${head} is not tag commit ${tag_commit}; not zipping"
    rm -rf "$work_dir"
    return 1
  fi
  local tmp="${dest}.partial"
  rm -f "$tmp"
  (cd "$work_root" && zip -r -9 "$tmp" "$folder_name")
  mv -f "$tmp" "$dest"
  log "${tag}: wrote $(basename "$dest") ($(wc -c < "$dest") bytes) pinned at ${head}"
  # Keep the source tree so a later run can see it was already built; do not rebuild.
  return 0
}

process_release() {
  local json_file="$1"
  local tag
  tag="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("tag_name") or "")' "$json_file")"
  if [[ -z "$tag" ]]; then
    log "skipping a release with no tag"
    return 0
  fi
  if already_done "$tag"; then
    log "${tag}: already handled; not rebuilding anything for this tag"
    return 0
  fi
  local name published
  name="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("name") or "")' "$json_file")"
  published="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("published_at") or "")' "$json_file")"
  log "${tag}: processing (${name:-no title}, published ${published:-unknown})"

  local assets_tmp
  assets_tmp="$(mktemp "${TMPDIR:-/tmp}/por-seed-assets.XXXXXX")"
  python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
for a in d.get("assets") or []:
    name=a.get("name") or ""
    url=a.get("browser_download_url") or ""
    size=a.get("size") or 0
    if name and url:
        print(f"{size}\t{name}\t{url}")
' "$json_file" > "$assets_tmp"

  if [[ ! -s "$assets_tmp" ]]; then
    log "${tag}: no downloadable assets yet; will retry later"
    rm -f "$assets_tmp"
    return 0
  fi

  local staging="${SEED_DIR}/staging/${tag}"
  mkdir -p "$staging" "${SEED_DIR}/torrents"
  local sums_file="${staging}/SHA256SUMS"
  local -a torrent_assets=()
  local size aname url kind dest
  local have_repo_asset=0

  while IFS=$'\t' read -r size aname url; do
    kind="$(classify_asset "$aname")"
    if [[ "$kind" == "sums" ]]; then
      if [[ ! -f "$sums_file" ]]; then
        log "${tag}: downloading ${aname}"
        download_file "$url" "$sums_file"
      fi
    fi
  done < "$assets_tmp"

  while IFS=$'\t' read -r size aname url; do
    kind="$(classify_asset "$aname")"
    case "$kind" in
      payload)
        dest="${SAVE_DIR}/${aname}"
        if [[ -f "$dest" && -n "$size" && "$size" =~ ^[0-9]+$ ]] && [[ "$(wc -c < "$dest")" -eq "$size" ]]; then
          log "${tag}: ${aname} already present"
        else
          log "${tag}: downloading ${aname}"
          download_file "$url" "$dest"
        fi
        asset_in_sums "$sums_file" "$dest"
        ;;
      repo_zip)
        have_repo_asset=1
        dest="${SAVE_DIR}/${aname}"
        if [[ -f "$dest" ]]; then
          log "${tag}: ${aname} already present; leaving it untouched"
        else
          log "${tag}: downloading ${aname}"
          download_file "$url" "$dest"
        fi
        asset_in_sums "$sums_file" "$dest"
        ;;
      torrent)
        torrent_assets+=("${aname}"$'\t'"${url}"$'\t'"${size}")
        ;;
    esac
  done < "$assets_tmp"

  if [[ "$have_repo_asset" -eq 0 ]]; then
    dest="${SAVE_DIR}/Pool-of-Radiance-Special-Edition-${tag}-repo.zip"
    if ! ensure_repo_zip "$tag" "$dest"; then
      rm -f "$assets_tmp"
      return 1
    fi
  fi

  if [[ ${#torrent_assets[@]} -eq 0 ]]; then
    log "${tag}: payloads may be present, but .torrent assets are not on the release yet; will retry later"
    rm -f "$assets_tmp"
    return 0
  fi

  local line rest dest_watch payload ready=0 missing=0
  for line in "${torrent_assets[@]}"; do
    aname="${line%%$'\t'*}"
    rest="${line#*$'\t'}"
    url="${rest%%$'\t'*}"
    payload="${SAVE_DIR}/${aname%.torrent}"
    if [[ ! -f "$payload" ]]; then
      log "${tag}: not dropping ${aname}; payload missing (${payload})"
      missing=$((missing+1))
      continue
    fi
    log "${tag}: placing ${aname} in ${WATCH_DIR}"
    download_file "$url" "${SEED_DIR}/torrents/${aname}"
    dest_watch="${WATCH_DIR}/${aname}"
    cp -f "${SEED_DIR}/torrents/${aname}" "${dest_watch}.adding"
    mv -f "${dest_watch}.adding" "$dest_watch"
    ready=$((ready+1))
  done

  if [[ "$missing" -gt 0 ]]; then
    log "${tag}: ${ready} torrent(s) queued, ${missing} waiting on payloads; will retry later"
    rm -f "$assets_tmp"
    return 0
  fi

  mark_done "$tag"
  log "${tag}: done (${ready} torrent(s) placed in ${WATCH_DIR})"
  rm -f "$assets_tmp"
  return 0
}

main() {
  mkdir -p "$SEED_DIR" "$STATE_DIR" "${SEED_DIR}/torrents" "${SEED_DIR}/staging" "$WATCH_DIR"
  need_cmds
  exec 9>"$LOCK"
  if ! flock -n 9; then
    log "already running; exiting"
    exit 0
  fi
  log "start"
  local body rc=0
  body="$(mktemp "${TMPDIR:-/tmp}/por-seed-releases.XXXXXX")"
  set +e
  fetch_releases > "$body"
  rc=$?
  set -e
  if [[ "$rc" -eq 2 || "$rc" -eq 3 ]]; then
    rm -f "$body"; log "finish (no work)"; exit 0
  fi
  if [[ "$rc" -ne 0 ]]; then
    rm -f "$body"; log "finish (api error)"; exit 1
  fi
  local count
  count="$(python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); print(len(data) if isinstance(data,list) else 0)' "$body")"
  log "visible public releases: ${count}"
  if [[ "$count" == "0" ]]; then
    rm -f "$body"; log "finish (none)"; exit 0
  fi
  local i rel
  for i in $(python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); print(" ".join(str(i) for i,r in enumerate(data) if not r.get("draft")))' "$body"); do
    rel="$(mktemp "${TMPDIR:-/tmp}/por-seed-rel.XXXXXX")"
    python3 -c 'import json,sys; data=json.load(open(sys.argv[1])); json.dump(data[int(sys.argv[2])], open(sys.argv[3],"w"))' "$body" "$i" "$rel"
    process_release "$rel"
    rm -f "$rel"
  done
  rm -f "$body"
  log "finish"
}

main "$@"
