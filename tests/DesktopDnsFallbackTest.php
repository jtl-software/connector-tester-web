<?php

declare(strict_types=1);

/**
 * Framework-free regression test for Jtl\ConnectorTester\DesktopDnsFallback - the
 * logic backing the desktop-only DNS fallback in ConnectorTesterClient (see that
 * class's `retryWithSystemResolvedHost()` for how these pieces are composed).
 *
 * Background bug: static-php-cli's bundled curl links against c-ares, which reads
 * only /etc/resolv.conf and never consults macOS's /etc/resolver/* entries (used by
 * Laravel Herd/Valet for TLDs like `.test`). This caused authentication against
 * local connectors to fail in the desktop app while working fine in the web app
 * (whose Homebrew/system PHP curl uses the system resolver). See
 * .superpowers/sdd/2026-07-30-desktop-electron-app/backend-report.md for the full
 * writeup.
 *
 * The project has no PHPUnit (or any other test framework) wired up for `src/`, so -
 * matching the project's existing convention of small framework-free scripts (see
 * desktop/scripts/smoke.js) - this is a plain PHP script: each check prints
 * `PASS`/`FAIL` and the script exits non-zero if anything failed.
 *
 * Run with either PHP build; the whole point of these helpers is that they behave
 * identically (mostly as no-ops) regardless of which curl is behind them:
 *   php tests/DesktopDnsFallbackTest.php
 *   ./desktop/php/darwin-arm64/php tests/DesktopDnsFallbackTest.php
 */

require __DIR__ . '/../vendor/autoload.php';

use Jtl\ConnectorTester\DesktopDnsFallback;

$failures = 0;

/**
 * @param mixed $actual
 * @param mixed $expected
 */
function check(string $label, $actual, $expected): void
{
    global $failures;
    if ($actual === $expected) {
        echo "PASS  {$label}\n";
        return;
    }
    $failures++;
    echo "FAIL  {$label}\n";
    echo '      expected: ' . var_export($expected, true) . "\n";
    echo '      actual:   ' . var_export($actual, true) . "\n";
}

// --- isCurlBuiltWithCAres ---------------------------------------------------
// This is the guard that keeps the whole fallback a no-op for the web app's
// Homebrew/system PHP. Empirically, curl_version()['ares'] is present-but-empty
// (not absent) on non-ares builds, which is why empty() rather than isset() matters.
check(
    'isCurlBuiltWithCAres: true when ares is a non-empty version string (bundled desktop PHP)',
    DesktopDnsFallback::isCurlBuiltWithCAres(['ares' => '1.34.6']),
    true
);
check(
    'isCurlBuiltWithCAres: false when ares is present but an empty string (real Homebrew PHP shape)',
    DesktopDnsFallback::isCurlBuiltWithCAres(['ares' => '']),
    false
);
check(
    'isCurlBuiltWithCAres: false when the ares key is entirely absent',
    DesktopDnsFallback::isCurlBuiltWithCAres([]),
    false
);

// --- isDnsResolutionFailure --------------------------------------------------
check(
    'isDnsResolutionFailure: true for errno 6 (CURLE_COULDNT_RESOLVE_HOST)',
    DesktopDnsFallback::isDnsResolutionFailure(\CURLE_COULDNT_RESOLVE_HOST),
    true
);
check(
    'isDnsResolutionFailure: false for null errno (no handler context)',
    DesktopDnsFallback::isDnsResolutionFailure(null),
    false
);
check(
    'isDnsResolutionFailure: false for a different curl errno (e.g. 7 = could not connect)',
    DesktopDnsFallback::isDnsResolutionFailure(7),
    false
);

// --- resolveHostViaSystemResolver --------------------------------------------
check(
    'resolveHostViaSystemResolver: null for a literal IPv4 address (nothing to resolve)',
    DesktopDnsFallback::resolveHostViaSystemResolver('127.0.0.1'),
    null
);
check(
    'resolveHostViaSystemResolver: null for a literal IPv6 address (nothing to resolve)',
    DesktopDnsFallback::resolveHostViaSystemResolver('::1'),
    null
);
check(
    'resolveHostViaSystemResolver: null for a host that cannot resolve (RFC 2606 reserved .invalid TLD)',
    DesktopDnsFallback::resolveHostViaSystemResolver('definitely-not-a-real-host.invalid'),
    null
);
check(
    'resolveHostViaSystemResolver: resolves "localhost" to a real loopback address',
    DesktopDnsFallback::resolveHostViaSystemResolver('localhost'),
    '127.0.0.1'
);

// --- resolvePort --------------------------------------------------------------
check(
    'resolvePort: defaults to 80 for a plain http:// URL with no explicit port',
    DesktopDnsFallback::resolvePort('http://shopware6-connector-saas.public.test'),
    80
);
check(
    'resolvePort: defaults to 443 for a plain https:// URL with no explicit port',
    DesktopDnsFallback::resolvePort('https://shopware6-connector-saas.public.test'),
    443
);
check(
    'resolvePort: honours an explicit port even on http://',
    DesktopDnsFallback::resolvePort('http://shopware6-connector-saas.public.test:8080/connector.php'),
    8080
);

// --- withCurlResolveOverride ---------------------------------------------------
$config = DesktopDnsFallback::withCurlResolveOverride([], 'shopware6-connector-saas.public.test', 80, '127.0.0.1');
check(
    'withCurlResolveOverride: adds a CURLOPT_RESOLVE entry into an empty config',
    $config['curl'][\CURLOPT_RESOLVE] ?? null,
    ['shopware6-connector-saas.public.test:80:127.0.0.1']
);

$configWithExisting = DesktopDnsFallback::withCurlResolveOverride(
    ['allow_redirects' => false, 'curl' => [\CURLOPT_TIMEOUT => 5]],
    'my-connector.test',
    443,
    '127.0.0.1'
);
check(
    'withCurlResolveOverride: preserves pre-existing, unrelated curl options',
    $configWithExisting['curl'][\CURLOPT_TIMEOUT] ?? null,
    5
);
check(
    'withCurlResolveOverride: preserves pre-existing, unrelated top-level config',
    $configWithExisting['allow_redirects'] ?? null,
    false
);
check(
    'withCurlResolveOverride: adds the resolve entry alongside pre-existing curl options',
    $configWithExisting['curl'][\CURLOPT_RESOLVE] ?? null,
    ['my-connector.test:443:127.0.0.1']
);

echo "\n";
if ($failures > 0) {
    echo "FAILED: {$failures} check(s) failed\n";
    exit(1);
}

echo "ALL PASSED\n";
exit(0);
