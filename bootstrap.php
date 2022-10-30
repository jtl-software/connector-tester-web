<?php

require_once 'vendor/autoload.php';

use Twig\Extension\DebugExtension;
use Twig\Loader\FilesystemLoader;
use Twig\Environment;

$loader = new FilesystemLoader(__DIR__ . '/templates');
$twig = new Environment($loader, [
    'debug' => false,
    'auto_reload' => true,
    //'cache' => __DIR__ . 'templates_c',
]);
$twig->addExtension(new DebugExtension());

try {
    $template = $twig->render('index.twig', [
    ]);
} catch (\Twig\Error\LoaderError $e) {
    echo "Can't load template, do the files exist?";
}