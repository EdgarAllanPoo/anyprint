#!/usr/bin/env bash
#
# Redeploy anyprint (API + web) on the droplet.
#
#   ./deploy.sh                  pull main, install, build, reload pm2
#   SKIP_PULL=1 ./deploy.sh      deploy the working tree as-is (no git pull)
#   BRANCH=hotfix ./deploy.sh    deploy a different branch
#
# The web build runs BEFORE anything is reloaded, so a broken build aborts the
# deploy and leaves the currently running site untouched.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BRANCH="${BRANCH:-main}"
SKIP_PULL="${SKIP_PULL:-0}"
ALLOW_NONPROD_ENV="${ALLOW_NONPROD_ENV:-0}"

API_HEALTH="http://127.0.0.1:3001/health"
WEB_HEALTH="http://127.0.0.1:3000/"

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[1;32mOK\033[0m   %s\n' "$*"; }
warn() { printf '    \033[1;33mWARN\033[0m %s\n' "$*"; }
fail() { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

# --------------------------------------------------------------- preflight --
log "Preflight"

for bin in node npm pm2 git curl; do
  command -v "$bin" >/dev/null 2>&1 || fail "$bin is not installed or not on PATH"
done
ok "node $(node -v), npm $(npm -v), pm2 $(pm2 -v)"

[ -f api/.env ]       || fail "api/.env is missing"
[ -f web/.env.local ] || fail "web/.env.local is missing (next build bakes NEXT_PUBLIC_* into the bundle)"

env_value() {
  grep -E "^$1=" "$2" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '"'"'"
}

FRONTEND_URL="$(env_value FRONTEND_URL api/.env)"
PUBLIC_API_URL="$(env_value NEXT_PUBLIC_API_URL web/.env.local)"

# These two are the classic way to ship a working build that is broken in prod:
# a localhost CORS origin, or a browser bundle pointing at localhost:3001.
if [ "$ALLOW_NONPROD_ENV" = "1" ]; then
  warn "ALLOW_NONPROD_ENV=1 - skipping production env checks"
else
  case "$FRONTEND_URL" in
    https://*) ok "api FRONTEND_URL = $FRONTEND_URL" ;;
    *) fail "api/.env FRONTEND_URL is '${FRONTEND_URL:-<unset>}'
        Production needs the https origin - CORS and the Doku callback URLs are built from it.
        Set ALLOW_NONPROD_ENV=1 to deploy anyway." ;;
  esac

  case "$PUBLIC_API_URL" in
    https://*) ok "web NEXT_PUBLIC_API_URL = $PUBLIC_API_URL" ;;
    *) fail "web/.env.local NEXT_PUBLIC_API_URL is '${PUBLIC_API_URL:-<unset>}'
        This is compiled into the browser bundle and must be https://anyprint.id/api
        Set ALLOW_NONPROD_ENV=1 to deploy anyway." ;;
  esac
fi

PREV_SHA="$(git rev-parse HEAD)"

# ------------------------------------------------------------------ source --
if [ "$SKIP_PULL" = "1" ]; then
  warn "SKIP_PULL=1 - deploying the working tree as-is"
else
  log "Updating source ($BRANCH)"

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    fail "working tree has uncommitted changes - commit, stash, or use SKIP_PULL=1"
  fi

  git fetch --prune origin "$BRANCH"
  git checkout "$BRANCH"
  # --ff-only so a diverged local history stops the deploy instead of merging.
  git merge --ff-only "origin/$BRANCH"
fi
ok "at $(git log -1 --oneline)"

# ------------------------------------------------------------------- build --
log "Installing API dependencies"
( cd api && npm ci --omit=dev )

log "Installing web dependencies"
# Not --omit=dev: typescript and tailwind are devDependencies and next build needs them.
( cd web && npm ci )

log "Building web (slowest step - a few minutes on a 1 vCPU box)"
( cd web && NODE_ENV=production npm run build )
ok "build succeeded"

# ------------------------------------------------------------------ reload --
log "Reloading pm2"
mkdir -p logs
pm2 startOrReload ecosystem.config.js --update-env
pm2 save --force

# ------------------------------------------------------------------ verify --
log "Health checks"

wait_for() {
  local name="$1" url="$2" want="$3" code=""
  for _ in $(seq 1 30); do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$url" || true)"
    [ "$code" = "$want" ] && { ok "$name -> HTTP $code"; return 0; }
    sleep 1
  done
  warn "$name -> HTTP ${code:-no response} (expected $want)"
  return 1
}

HEALTHY=1
wait_for "api  $API_HEALTH" "$API_HEALTH" 200 || HEALTHY=0
wait_for "web  $WEB_HEALTH" "$WEB_HEALTH" 200 || HEALTHY=0

for app in anyprint-api anyprint-web; do
  status="$(pm2 jlist | node -e "
    let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{
      const a=JSON.parse(d).find(x=>x.name===process.argv[1]);
      console.log(a ? a.pm2_env.status : 'missing');
    });" "$app")"
  [ "$status" = "online" ] && ok "$app is $status" || { warn "$app is $status"; HEALTHY=0; }
done

echo
pm2 status

if [ "$HEALTHY" != "1" ]; then
  cat >&2 <<EOF

$(printf '\033[1;31mDeploy finished but health checks did not pass.\033[0m')

  logs:      pm2 logs --lines 100
  rollback:  git reset --hard $PREV_SHA && SKIP_PULL=1 ./deploy.sh
EOF
  exit 1
fi

log "Deploy complete - https://anyprint.id"
