<?php

declare(strict_types=1);

namespace Jtl\ConnectorTester;

/**
 * Pure, side-effect-light helpers backing {@see ConnectorTesterClient}'s desktop-only
 * DNS fallback.
 *
 * Background: the desktop app bundles a static PHP (static-php-cli) whose curl is
 * linked against c-ares. c-ares implements its own DNS stack that only reads
 * `/etc/resolv.conf` - it never consults macOS's `/etc/resolver/*` entries, which is
 * how Laravel Herd/Valet/dnsmasq route custom TLDs (e.g. `.test`) to local
 * connectors. PHP's own `gethostbyname()` goes through the system resolver
 * (mDNSResponder) and resolves these hosts correctly. Ordinary system/Homebrew PHP
 * builds (used by the web deployment) link curl against the system resolver
 * directly, so `curl_version()['ares']` is an empty string there and every method
 * here is designed to be a no-op in that case.
 *
 * Extracted into its own class (rather than kept as private methods on
 * ConnectorTesterClient) purely so each decision is a small, pure function that can
 * be unit-tested without spinning up a Guzzle client, a real HTTP request, or a
 * live ConnectException.
 */
final class DesktopDnsFallback
{
    /**
     * True only when curl was actually built against c-ares.
     *
     * Must use `empty()`, not `isset()`: on ordinary (non-ares) curl builds the
     * `ares` key returned by `curl_version()` is present but an empty string, not
     * absent - `isset()` alone would incorrectly return true for the web app's
     * Homebrew/system PHP and break the "no-op on non-ares curl" guarantee.
     *
     * @param array<string, mixed> $curlVersion the array returned by curl_version()
     */
    public static function isCurlBuiltWithCAres(array $curlVersion): bool
    {
        return !empty($curlVersion['ares']);
    }

    /**
     * True only when the given curl errno is a pure DNS-resolution failure
     * (CURLE_COULDNT_RESOLVE_HOST / 6). Connection refused, timeouts, TLS errors,
     * etc. are all left untouched by the fallback.
     */
    public static function isDnsResolutionFailure(?int $curlErrno): bool
    {
        return $curlErrno === \CURLE_COULDNT_RESOLVE_HOST;
    }

    /**
     * Resolves $host through the system resolver (PHP's gethostbyname(), which -
     * unlike curl's own c-ares - honours macOS's /etc/resolver/* entries).
     *
     * Returns null (nothing usable) when:
     *  - $host is already a literal IP address (nothing to resolve, and pinning it
     *    would be pointless).
     *  - gethostbyname() cannot resolve it either - it returns the input string
     *    unchanged on failure, which is why the result is checked against both the
     *    original $host and FILTER_VALIDATE_IP.
     *
     * Otherwise returns the resolved IPv4 address.
     */
    public static function resolveHostViaSystemResolver(string $host): ?string
    {
        if ($host === '' || \filter_var($host, \FILTER_VALIDATE_IP) !== false) {
            return null;
        }

        $resolved = \gethostbyname($host);
        if ($resolved === $host || \filter_var($resolved, \FILTER_VALIDATE_IP) === false) {
            return null;
        }

        return $resolved;
    }

    /**
     * Extracts the effective port for $endpointUrl, defaulting to the scheme's
     * standard port (80/443) when none is explicit in the URL.
     */
    public static function resolvePort(string $endpointUrl): int
    {
        $explicitPort = \parse_url($endpointUrl, \PHP_URL_PORT);
        if (\is_int($explicitPort)) {
            return $explicitPort;
        }

        return \parse_url($endpointUrl, \PHP_URL_SCHEME) === 'https' ? 443 : 80;
    }

    /**
     * Returns a copy of a Guzzle client config array with a CURLOPT_RESOLVE entry
     * added for "$host:$port" -> $ip, merged alongside (not replacing) any curl
     * options already present.
     *
     * @param array<string, mixed> $config an existing Guzzle Client::getConfig() array
     * @return array<string, mixed>
     */
    public static function withCurlResolveOverride(array $config, string $host, int $port, string $ip): array
    {
        $curlOptions                   = $config['curl'] ?? [];
        $curlOptions[\CURLOPT_RESOLVE] = \array_merge(
            $curlOptions[\CURLOPT_RESOLVE] ?? [],
            ["{$host}:{$port}:{$ip}"]
        );
        $config['curl'] = $curlOptions;

        return $config;
    }
}
