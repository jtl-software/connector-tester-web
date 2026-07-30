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
# Overridable so tests can point this at a scratch directory instead of the
# real desktop/php/.
PHP_DIR="${PHP_DIR:-${HERE}/../php}"

# static-php-cli publishes macOS "cli" builds under static-php-cli/common/ and
# Windows "cli" builds under static-php-cli/windows/spc-max/ — these are
# different top-level paths on dl.static-php.dev, verified by browsing
# https://dl.static-php.dev/static-php-cli/ (as directory-listing JSON via
# ?format=json) on 2026-07-30. The plan's original draft assumed a single
# shared "common" base for all three targets; that 404s for Windows.
# Overridable so the checksum-verification logic below can be exercised
# against local fixtures in tests, without hitting the network.
COMMON_BASE="${COMMON_BASE:-https://dl.static-php.dev/static-php-cli/common}"
WINDOWS_BASE="${WINDOWS_BASE:-https://dl.static-php.dev/static-php-cli/windows/spc-max}"

# target-triple  url  binary-name
TARGETS=(
  "darwin-arm64 ${COMMON_BASE}/php-${PHP_VERSION}-cli-macos-aarch64.tar.gz   php"
  "darwin-x64   ${COMMON_BASE}/php-${PHP_VERSION}-cli-macos-x86_64.tar.gz    php"
  "win32-x64    ${WINDOWS_BASE}/php-${PHP_VERSION}-cli-win.zip               php.exe"
)

REQUIRED_EXTS="fileinfo iconv json mbstring pdo sqlite3 tokenizer zip session openssl curl"

# --update-checksums regenerates desktop/php/checksums.txt from whatever is
# currently on disk. It is a deliberate, separate step — never an automatic
# side effect of a normal fetch — because the whole point of committing
# checksums is that a routine `fetch-php.sh` run can only *verify* against
# them, not silently rewrite them to match whatever got downloaded. Without
# that separation, a compromised/hijacked download source would produce a
# diff of three changed hashes that reads as a routine version bump instead
# of a red flag.
UPDATE_CHECKSUMS=0
if [[ "${1:-}" == "--update-checksums" ]]; then
  UPDATE_CHECKSUMS=1
fi

CHECKSUMS_FILE="${PHP_DIR}/checksums.txt"

checksum_of() {
  shasum -a 256 "$1" | awk '{print $1}'
}

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

  # Verify against the committed checksum BEFORE the binary is moved into
  # place and chmod +x'd — a mismatch here means the download is not what we
  # expect (compromised/hijacked source, corrupted transfer, a silent
  # version bump upstream) and must never be installed sight unseen.
  #
  # --update-checksums is the explicit escape hatch for an *intentional*
  # version bump: by definition the new binary's hash will not match the old
  # baseline, so this step is skipped in that mode — the operator is trusted
  # to have verified the new binary out-of-band before running with the flag.
  if [[ "${UPDATE_CHECKSUMS}" -eq 1 ]]; then
    : # trusted: operator explicitly asked to record a new baseline
  elif [[ -f "${CHECKSUMS_FILE}" ]] && grep -q "  \./${triple}/${binary}\$" "${CHECKSUMS_FILE}"; then
    expected="$(grep "  \./${triple}/${binary}\$" "${CHECKSUMS_FILE}" | awk '{print $1}')"
    actual="$(checksum_of "${found}")"
    if [[ "${actual}" != "${expected}" ]]; then
      echo "ERROR: checksum mismatch for ${triple}/${binary}" >&2
      echo "  expected: ${expected}" >&2
      echo "  actual:   ${actual}" >&2
      echo "This binary was NOT installed. If this is an intentional PHP version bump," >&2
      echo "re-run with --update-checksums after verifying the new binary out-of-band." >&2
      rm -rf "${tmp}"
      exit 1
    fi
    echo "==> ${triple}: checksum verified"
  else
    echo "WARNING: no committed checksum for ${triple}/${binary} — installing unverified." >&2
    echo "  Run with --update-checksums once you have verified this binary out-of-band." >&2
  fi

  mv "${found}" "${dest}/${binary}"
  chmod +x "${dest}/${binary}"
  rm -rf "${tmp}"
  echo "==> ${triple}: installed"
done

if [[ "${UPDATE_CHECKSUMS}" -eq 1 ]]; then
  ( cd "${PHP_DIR}" && find . -type f \( -name php -o -name php.exe \) -exec shasum -a 256 {} \; \
    | sort > checksums.txt )
  echo "==> recorded new checksum baseline in checksums.txt (--update-checksums was passed)"
elif [[ ! -f "${CHECKSUMS_FILE}" ]]; then
  ( cd "${PHP_DIR}" && find . -type f \( -name php -o -name php.exe \) -exec shasum -a 256 {} \; \
    | sort > checksums.txt )
  echo "==> checksums.txt did not exist yet — recorded a first baseline. Commit it and treat"
  echo "    any future change to it as something that needs out-of-band verification."
else
  echo "==> checksums.txt already present — left untouched (pass --update-checksums to replace it)"
fi

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
