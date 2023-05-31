<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Definition\RpcMethod;

class ActionController extends ConnectorClient
{
    /**
     * @var string
     */
    public string $response;

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
     */
    public function controllerPull(string $controller): string
    {
        $this->setResponse(\json_encode($this->pull($controller)));
        return $this->getResponse();
    }

    /**
     * @return string
     */
    public function getResponse(): string
    {
        return $this->response;
    }

    /**
     * @param string $response
     * @return ActionController
     */
    public function setResponse(string $response): ActionController
    {
        $this->response = $response;
        return $this;
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     */
    public function controllerPush(string $controller, string $payload): string
    {
        $payload = \json_decode($payload, \JSON_OBJECT_AS_ARRAY);
        $this->setFullResponse(true);
        $this->setResponse(\json_encode($this->push($controller, $payload)));
        return $this->getResponse();
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     */
    public function controllerDelete(string $controller, string $payload): string
    {
        $payload = \json_decode($payload, \JSON_OBJECT_AS_ARRAY);
        $this->setFullResponse(true);
        $this->setResponse(\json_encode($this->delete($controller, $payload)));
        return $this->getResponse();
    }

    /**
     * @param string $controller
     * @return string
     * @throws GuzzleException
     */
    public function controllerStats(string $controller): string
    {
        $this->setResponse(\json_encode($this->request($controller . '.statistic', ['limit' => 0])));
        return $this->getResponse();
    }

    /**
     * @return string
     */
    public function connectorFinish(): string
    {
        $this->setResponse(\json_encode($this->finish()));
        return $this->getResponse();
    }

    /**
     * @return string
     */
    public function connectorIdentify(): string
    {
        $this->setFullResponse(false);
        $response = $this->identify();
        $this->setResponse(\json_encode($this->serializer->toArray($response)));
        return $this->getResponse();
    }

    /**
     * @return string
     * @throws GuzzleException
     */
    public function coreFeatures(): string
    {
        $this->setResponse(\json_encode($this->request(RpcMethod::FEATURES)));
        return $this->getResponse();
    }


    /**
     * @return string
     * @throws GuzzleException
     */
    public function coreInit(): string
    {
        $this->setResponse(\json_encode($this->request(RpcMethod::INIT)));
        return $this->getResponse();
    }
}
