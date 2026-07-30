#!/usr/bin/env bash
set -euo pipefail

#
# PHP_VERSION must satisfy the project's actual Composer platform requirement.
# composer.json declares "php": "^8.1", but composer.lock pins
# symfony/event-dispatcher and symfony/finder (pulled in unconstrained via
# jtl/connector's "*" requirement, resolved against the Homebrew PHP 8.5.1
# used to generate the lock file) to versions whose own composer.json
# requires PHP >= 8.4. vendor/composer/platform_check.php enforces this on
# every request, so a bundled PHP < 8.4 fails at runtime with "Composer
# detected issues in your platform" even though it looks otherwise fine.
# Verified 2026-07-30 by running the smoke test against a real 8.2.29
# static build.
PHP_VERSION="${PHP_VERSION:-8.4.20}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PHP_DIR="${HERE}/../php"

# static-php-cli publishes macOS "cli" builds under static-php-cli/common/ and
# Windows "cli" builds under static-php-cli/windows/spc-max/ — these are
# different top-level paths on dl.static-php.dev, verified by browsing
# https://dl.static-php.dev/static-php-cli/ (as directory-listing JSON via
# ?format=json) on 2026-07-30. The plan's original draft assumed a single
# shared "common" base for all three targets; that 404s for Windows.
COMMON_BASE="https://dl.static-php.dev/static-php-cli/common"
WINDOWS_BASE="https://dl.static-php.dev/static-php-cli/windows/spc-max"

# target-triple  url  binary-name
TARGETS=(
  "darwin-arm64 ${COMMON_BASE}/php-${PHP_VERSION}-cli-macos-aarch64.tar.gz   php"
  "darwin-x64   ${COMMON_BASE}/php-${PHP_VERSION}-cli-macos-x86_64.tar.gz    php"
  "win32-x64    ${WINDOWS_BASE}/php-${PHP_VERSION}-cli-win.zip               php.exe"
)

REQUIRED_EXTS="fileinfo iconv json mbstring pdo sqlite3 tokenizer zip session openssl curl"

for entry in "${TARGETS[@]}"; do
  read -r triple url binary <<< "${entry}"
  dest="${PHP_DIR}/${triple}"
  mkdir -p "${dest}"

  if [[ -x "${dest}/${binary}" ]]; then
    echo "==> ${triple}: already present, skipping"
    continue
  fi

  archive="$(basename "${url}")"
  echo "==> ${triple}: downloading ${url}"
  tmp="$(mktemp -d)"
  curl -fsSL "${url}" -o "${tmp}/${archive}"

  if [[ "${archive}" == *.zip ]]; then
    unzip -q -o "${tmp}/${archive}" -d "${tmp}"
  else
    tar -xzf "${tmp}/${archive}" -C "${tmp}"
  fi

  found="$(find "${tmp}" -type f -name "${binary}" -print -quit)"
  if [[ -z "${found}" ]]; then
    echo "ERROR: ${binary} not found inside ${archive}" >&2
    exit 1
  fi

  mv "${found}" "${dest}/${binary}"
  chmod +x "${dest}/${binary}"
  rm -rf "${tmp}"
  echo "==> ${triple}: installed"
done

# Record checksums so a future fetch can be verified against a known-good set.
( cd "${PHP_DIR}" && find . -type f \( -name php -o -name php.exe \) -exec shasum -a 256 {} \; \
  | sort > checksums.txt )
echo "==> wrote checksums.txt"

# The macOS-native binary is the only one we can execute here; verify its
# extension set so a wrong build is caught now rather than at runtime.
NATIVE="${PHP_DIR}/darwin-$([[ "$(uname -m)" == "arm64" ]] && echo arm64 || echo x64)/php"
echo "==> verifying extensions on ${NATIVE}"
missing=""
for ext in ${REQUIRED_EXTS}; do
  if ! "${NATIVE}" -m | tr '[:upper:]' '[:lower:]' | grep -qx "${ext}"; then
    missing="${missing} ${ext}"
  fi
done

if [[ -n "${missing}" ]]; then
  echo "ERROR: static PHP is missing required extensions:${missing}" >&2
  echo "Build a custom binary with static-php-cli including all of: ${REQUIRED_EXTS}" >&2
  exit 1
fi

echo "==> all required extensions present"
