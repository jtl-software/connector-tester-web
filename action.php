<?php

use Jtl\ConnectorTester\ConnectorTester;

include "vendor/autoload.php";

$url        = $_POST['connectorUrl'];
$token      = $_POST['connectorToken'];
$action     = $_POST['action'];
$controller = $_POST['controller'];
$payload    = $_POST['payload'] ?? null;
$operation  = $_POST['operation'];

$tester = new ConnectorTester($token, $url, true);
$tester->setResponseFormat($tester::RESPONSE_FORMAT_ARRAY);

switch ($operation) {
    case 'triggerAction':
        echo $tester->triggerAction($controller, $action, $payload);
        break;
    case 'triggerAck':
        echo json_decode($tester->triggerAck());
        break;
    case 'clearLinkings':
        echo $tester->clearLinkings();
        break;
    case 'fromJson':
        $tester->fromJson($controller, $payload);
        break;
    case 'getSkeleton':
        echo $tester->getSkeleton($controller);
        break;
    case 'pushTest':
        echo json_decode($tester->pushTest());
        break;
    case 'modelPush':
        echo json_decode($tester->modelPush());
        break;
    case 'authenticate':
        echo $tester->startAuth();
}
