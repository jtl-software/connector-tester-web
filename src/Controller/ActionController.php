<?php

declare(strict_types=1);

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Core\Definition\RpcMethod;
use Jtl\ConnectorTester\ConnectorTesterClient;

class ActionController extends ConnectorTesterClient
{
    /**
     * @param string $controller
     * @param int $limit
     * @return string
     * @throws \JsonException
     */
    public function controllerPull(string $controller, int $limit = self::DEFAULT_PULL_LIMIT): string
    {
        return \json_encode($this->pull($controller, $limit), \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     * @throws \JsonException
     */
    public function controllerPush(string $controller, string $payload): string
    {
        if (empty($payload)) {
            return 'A payload is needed to push data';
        }

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
        if (empty($payload)) {
            return 'A payload is needed to delete data';
        }

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
