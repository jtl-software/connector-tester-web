<?php

declare(strict_types=1);

$path = \parse_url($_SERVER['REQUEST_URI'], \PHP_URL_PATH);

if (!\is_string($path)) {
    $path = '/';
}

// Use DOCUMENT_ROOT (set by php -S from the -t flag) rather than __DIR__.
// __DIR__ only equals the document root's parent in the packaged layout,
// where router.php is staged beside public/; in dev/smoke runs router.php
// lives in desktop/ while public/ is at the repo root, so they are not
// siblings.
$docRoot = $_SERVER['DOCUMENT_ROOT'];
$candidate = $docRoot . $path;

// Let the built-in server handle real files (JS, CSS, favicon) itself.
if ($path !== '/' && \is_file($candidate)) {
    return false;
}

require $docRoot . '/index.php';
