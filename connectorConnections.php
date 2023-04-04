<?php

declare(strict_types=1);

require_once 'vendor/autoload.php';

use Jtl\ConnectorTester\Controller\ConnectionController;

$name  = $_POST['newConnectionName'] ?? null;
$url   = $_POST['newConnectionUrl'];
$token = $_POST['newConnectionToken'];

$connectionController = new ConnectionController();

switch ($_POST['method']) {
    case 'newConnection':
        $connectionController->newConnection($name, $token, $url);
        echo 'saved';
        break;
    case 'fetchConnections':
        echo json_encode($connectionController->fetchConnections());
}
