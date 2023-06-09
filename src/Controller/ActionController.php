<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Definition\RpcMethod;

class ActionController extends ConnectorClient
{
    /**
     * @param string $token
     * @param string $endpointUrl
     * @param HttpClient|null $httpClient
     */
    public function __construct(string $token, string $endpointUrl, HttpClient $httpClient = null)
    {
        parent::__construct($token, $endpointUrl, $httpClient);
        $this->sessionId = $_SESSION['sessionId'] ?? '';
        $this->setResponseFormat(self::RESPONSE_FORMAT_ARRAY);
        $this->setFullResponse(true);
    }

    /**
     * @param string $controller
     * @return string
     * @throws \JsonException
     */
    public function controllerPull(string $controller): string
    {
        return \json_encode($this->pull($controller), \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     * @throws \JsonException
     */
    public function controllerPush(string $controller, string $payload): string
    {
        $payload = \json_decode($payload, flags: \JSON_OBJECT_AS_ARRAY);
        /** @var array<int, array<mixed>> $payload */
        return \json_encode($this->push($controller, $payload), \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     * @throws \JsonException
     */
    public function controllerDelete(string $controller, string $payload): string
    {
        $payload = \json_decode($payload, flags: \JSON_OBJECT_AS_ARRAY);
        /** @var array<int, array<mixed>> $payload */
        return \json_encode($this->delete($controller, $payload), \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @return string
     * @throws GuzzleException
     * @throws \JsonException
     */
    public function controllerStats(string $controller): string
    {
        return \json_encode($this->request($controller . '.statistic', ['limit' => 0]), \JSON_THROW_ON_ERROR);
    }

    /**
     * @return string
     * @throws \JsonException
     */
    public function connectorFinish(): string
    {
        return \json_encode($this->finish(), \JSON_THROW_ON_ERROR);
    }

    /**
     * @return string
     * @throws \JsonException
     */
    public function connectorIdentify(): string
    {
        $this->setFullResponse(false);
        $response = $this->identify();
        return \json_encode($this->serializer->toArray($response), \JSON_THROW_ON_ERROR);
    }

    /**
     * @return string
     * @throws GuzzleException
     * @throws \JsonException
     */
    public function coreFeatures(): string
    {
        return \json_encode($this->request(RpcMethod::FEATURES), \JSON_THROW_ON_ERROR);
    }


    /**
     * @return string
     * @throws GuzzleException
     * @throws \JsonException
     */
    public function coreInit(): string
    {
        return \json_encode($this->request(RpcMethod::INIT), \JSON_THROW_ON_ERROR);
    }
}
