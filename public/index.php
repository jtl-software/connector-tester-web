<?php

use Jtl\ConnectorTester\Controller\Kernel;

require __DIR__ . '/../vendor/autoload.php';

$app = new Kernel();

$app->run();
