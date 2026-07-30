<?php

declare(strict_types=1);

namespace Jtl\ConnectorTester\Controller;

use Psr\Container\ContainerInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\App;
use Slim\Factory\AppFactory;

class Kernel
{
    /**
     * @return void
     */
    public function run(): void
    {
        \session_start();

        $app = AppFactory::create();

        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();
        $app->add(function (ServerRequestInterface $request, RequestHandlerInterface $handler) {
            $response = $handler->handle($request);
            return $response->withAddedHeader('Access-Control-Allow-Origin', 'http://localhost:5173')->withAddedHeader(
                'Access-Control-Allow-Credentials',
                'true'
            );
        });
        // displayErrorDetails=true, logErrors=true, logErrorDetails=false:
        // errors are still shown to the caller and still logged, but Slim no
        // longer writes the full exception trace — including bound
        // constructor arguments such as the connector token on
        // AuthController — to stderr. That stderr is teed verbatim into
        // data/logs/php.log and surfaced in crash dialogs, and data/ is
        // documented as portable (carried on a USB stick), so the trace
        // detail is the actual leak; desktop/main.js's redactSecrets() is a
        // narrower belt-and-braces backstop on top of this, not a
        // replacement for it.
        $app->addErrorMiddleware(true, true, false);

        $this->registerRoutes($app);

        $app->run();
    }

    /**
     * @param App<ContainerInterface|null> $app
     * @return void
     */
    private function registerRoutes(App $app): void
    {
        $app->post('/authenticate', [RouteController::class, 'authenticate']);

        $app->post('/disconnect', [RouteController::class, 'disconnect']);

        $app->post('/Pull', [RouteController::class, 'pull']);

        $app->post('/Push', [RouteController::class, 'push']);

        $app->post('/Delete', [RouteController::class, 'delete']);

        $app->post('/Stats', [RouteController::class, 'stats']);

        $app->post('/Finish', [RouteController::class, 'finish']);

        $app->post('/Identify', [RouteController::class, 'identify']);

        $app->post('/Clear', [RouteController::class, 'clear']);

        $app->post('/Features', [RouteController::class, 'features']);

        $app->post('/Init', [RouteController::class, 'init']);

        $app->post('/triggerAck', [RouteController::class, 'triggerAck']);

        $app->post('/manualAck', [RouteController::class, 'manualAck']);

        $app->post('/getSkeleton', [RouteController::class, 'getSkeleton']);

        $app->post('/pushTest', [RouteController::class, 'pushTest']);

        $app->post('/clearLinkings', [RouteController::class, 'clear']);

        $app->post('/clearLinkingsFromJson', [RouteController::class, 'clearFromJson']);

        $app->post('/clearControllerLinkings', [RouteController::class, 'clearControllerLinkings']);

        $app->get('/', [RouteController::class, 'index']);
    }
}
