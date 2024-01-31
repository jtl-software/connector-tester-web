<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Nyholm\Psr7\Stream;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class RouteController
{
    private Client $client;

    public function __construct()
    {
        $this->client = new Client(
            [
                'allow_redirects' => false,
                'headers' =>
                    [
                        'User-Agent' => 'jtl-connector-web-tester/1'
                    ]
            ]
        );
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function authenticate(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes     = $this->getAttributes($request);
        $authController = new AuthController($attributes['connectorToken'], $attributes['connectorUrl'], $this->client);
        $response->getBody()->write($authController->startAuth());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     *
     * @return array<string, string>
     */
    private function getAttributes(ServerRequestInterface $request): array
    {
        /** @var array<string, string> $attributes */
        $attributes = $request->getParsedBody();
        return $attributes;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function disconnect(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes     = $this->getAttributes($request);
        $authController = new AuthController($attributes['connectorToken'], $attributes['connectorUrl'], $this->client);
        $authController->disconnect();

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function pull(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write(
            $actionController->controllerPull($attributes['controller'], (int)$attributes['limit'])
        );

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function push(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write(
            $actionController->controllerPush($attributes['controller'], $attributes['payload'])
        );

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function delete(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write(
            $actionController->controllerDelete($attributes['controller'], $attributes['payload'])
        );

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws GuzzleException
     * @throws \JsonException
     */
    public function stats(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->controllerStats($attributes['controller']));

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function finish(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->connectorFinish());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function identify(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->connectorIdentify());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function clear(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new LinkingsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->clearLinkings());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws GuzzleException|\JsonException
     */
    public function features(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->coreFeatures());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws GuzzleException|\JsonException
     */
    public function init(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes       = $this->getAttributes($request);
        $actionController = new ActionController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($actionController->coreInit());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function triggerAck(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes    = $this->getAttributes($request);
        $devController = new DevOptionsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($devController->triggerAck($attributes['controller'], $attributes['results']));

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \JsonException
     */
    public function getSkeleton(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes    = $this->getAttributes($request);
        $devController = new DevOptionsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($devController->getSkeleton($attributes['controller']));

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws GuzzleException|\JsonException
     */
    public function pushTest(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes    = $this->getAttributes($request);
        $devController = new DevOptionsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write($devController->pushTest());

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function clearFromJson(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes         = $this->getAttributes($request);
        $linkingsController = new LinkingsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write(
            $linkingsController->clearLinkingsFromJson($attributes['controller'], $attributes['payload'])
        );

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     */
    public function clearControllerLinkings(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $attributes         = $this->getAttributes($request);
        $linkingsController = new LinkingsController(
            $attributes['connectorToken'],
            $attributes['connectorUrl'],
            $this->client
        );
        $response->getBody()->write(
            $linkingsController->clearControllerLinkings($attributes['controller'])
        );

        return $response;
    }

    /**
     * @param ServerRequestInterface $request
     * @param ResponseInterface $response
     * @return ResponseInterface
     * @throws \RuntimeException
     */
    public function index(ServerRequestInterface $request, ResponseInterface $response): ResponseInterface
    {
        $file = \fopen(__DIR__ . '/../../public/frontend/index.html', 'r');
        if ($file === false) {
            throw new \RuntimeException('$file must not be false');
        }
        return $response->withBody(new Stream($file));
    }
}
