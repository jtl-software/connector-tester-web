<?php

use Jtl\ConnectorTester\Controller\ActionController;
use Jtl\ConnectorTester\Controller\AuthController;
use Jtl\ConnectorTester\Controller\DevOptionsController;
use Jtl\ConnectorTester\Controller\LinkingsController;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

session_start();
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");

$_SESSION['sessionId'] = $_SESSION['sessionId'] ?? null;
$url                   = $_POST['connectorUrl'];
$token                 = $_POST['connectorToken'];
$controller            = $_POST['controller'] ?? '';
$payload               = $_POST['payload'] ?? null;
$result                = $_POST['results'] ?? null;

$app = AppFactory::create();

$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->addErrorMiddleware(true, true, true);

$app->post('/authenticate', function (Request $request, Response $response) {
    $attributes     = $request->getParsedBody();
    $authController = new AuthController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($authController->startAuth());
    return $response;
});

$app->post('/disconnect', function (Request $request, Response $response) {
    $attributes     = $request->getParsedBody();
    $authController = new AuthController($attributes['connectorToken'], $attributes['connectorUrl']);
    $authController->disconnect();

    return $response;
});

$app->post('/Pull', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->controllerPull($attributes['controller']));

    return $response;
});

$app->post('/Push', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->controllerPush($attributes['controller'], $attributes['payload']));

    return $response;
});

$app->post('/Delete', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->controllerDelete($attributes['controller'], $attributes['payload']));

    return $response;
});

$app->post('/Stats', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->controllerStats($attributes['controller']));

    return $response;
});

$app->post('/Finish', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->connectorFinish());

    return $response;
});

$app->post('/Identify', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->connectorIdentify());

    return $response;
});

$app->post('/Clear', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->coreClearLinkings());

    return $response;
});

$app->post('/Features', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->coreFeatures());

    return $response;
});

$app->post('/Init', function (Request $request, Response $response) {
    $attributes       = $request->getParsedBody();
    $actionController = new ActionController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($actionController->coreInit());

    return $response;
});

$app->post('/triggerAck', function (Request $request, Response $response) {
    $attributes    = $request->getParsedBody();
    $devController = new DevOptionsController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($devController->triggerAck($attributes['controller'], $attributes['results']));

    return $response;
});

$app->post('/getSkeleton', function (Request $request, Response $response) {
    $attributes    = $request->getParsedBody();
    $devController = new DevOptionsController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($devController->getSkeleton($attributes['controller']));

    return $response;
});

$app->post('/pushTest', function (Request $request, Response $response) {
    $attributes    = $request->getParsedBody();
    $devController = new DevOptionsController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($devController->pushTest());

    return $response;
});

$app->post('/clearLinkings', function (Request $request, Response $response) {
    $attributes         = $request->getParsedBody();
    $linkingsController = new LinkingsController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write($linkingsController->clearLinkings());

    return $response;
});

$app->post('/clearLinkingsFromJson', function (Request $request, Response $response) {
    $attributes         = $request->getParsedBody();
    $linkingsController = new LinkingsController($attributes['connectorToken'], $attributes['connectorUrl']);
    $response->getBody()->write(
        $linkingsController->clearLinkingsFromJson($attributes['controller'], $attributes['payload'])
    );

    return $response;
});

$app->run();
