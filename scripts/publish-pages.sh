#!/usr/bin/env bash
# Run from the repository root with existing Git authentication. No force pushes.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' 'Commit source changes before publishing.' >&2
  exit 1
fi
git fetch origin refs/heads/main:refs/remotes/origin/main refs/heads/gh-pages:refs/remotes/origin/gh-pages
source_commit=$(git rev-parse HEAD)
if [[ "$source_commit" != "$(git rev-parse origin/main)" ]]; then
  printf '%s\n' 'Publish only the current origin/main commit.' >&2
  exit 1
fi
npm test
NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_BASE_PATH=/AIAgent npm run build
touch out/.nojekyll
printf '%s\n' "$source_commit" > out/build-source.txt
publish_dir=$(mktemp -d /tmp/aiagent-pages.XXXXXX)
trap 'rm -rf "$publish_dir"' EXIT
export GIT_INDEX_FILE="$publish_dir/index"
git read-tree --empty
git --work-tree="$PWD/out" add --all --force
publish_tree=$(git write-tree)
parent_commit=$(git rev-parse origin/gh-pages)
publish_commit=$(printf 'Publish AIAgent %s\n' "$source_commit" | git commit-tree "$publish_tree" -p "$parent_commit")
git push origin "$publish_commit:refs/heads/gh-pages"
printf '%s\n' 'Static site pushed. Check the GitHub Pages deployment run before reporting it live.'
