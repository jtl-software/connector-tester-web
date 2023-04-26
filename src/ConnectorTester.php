<?php

namespace Jtl\ConnectorTester;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Definition\RpcMethod;
use Jtl\Connector\Core\Model\Ack;
use Jtl\Connector\Core\Model\Identity;

class ConnectorTester extends ConnectorClient
{
    public const
        ACTION_PULL     = 'Pull',
        ACTION_PUSH     = 'Push',
        ACTION_DELETE   = 'Delete',
        ACTION_STATS    = 'Stats',
        ACTION_FINISH   = 'Finish',
        ACTION_IDENTIFY = 'Identify',
        ACTION_AUTH     = 'Auth',
        ACTION_CLEAR    = 'Clear',
        ACTION_FEATURES = 'Features',
        ACTION_INIT     = 'Init';


    public function __construct(
        string $token,
        string $endpointUrl,
        bool $fullResponse = false,
        HttpClient $httpClient = null
    ) {
        parent::__construct($token, $endpointUrl, $fullResponse, $httpClient);
        $this->sessionId = $_SESSION['sessionId'];
    }

    /**
     * @param string $controller
     * @param string $action
     * @param string|null $payload
     * @return string
     * @throws GuzzleException
     */
    public function triggerAction(string $controller, string $action, string $payload = null): string
    {
        $payload  = \json_decode($payload, \JSON_OBJECT_AS_ARRAY);
        $response = '';

        try {
            switch ($action) {
                case self::ACTION_PULL:
                    $response = $this->pull($controller);
                    break;
                case self::ACTION_PUSH:
                    $response = $this->push($controller, $payload);
                    break;
                case self::ACTION_DELETE:
                    $this->fullResponse = true;
                    $response           = $this->delete($controller, $payload);
                    break;
                case self::ACTION_STATS:
                    $response = $this->request($controller . '.statistic', ['limit' => 0]);
                    break;
                case self::ACTION_IDENTIFY:
                    $this->fullResponse = false;
                    $response           = $this->identify();
                    $response           = $this->serializer->toArray($response);
                    break;
                case self::ACTION_FEATURES:
                    $response = $this->request(RpcMethod::FEATURES);
                    break;
                case self::ACTION_CLEAR:
                    $this->fullResponse = false;
                    $response           = $this->clearLinkings();
                    break;
                case self::ACTION_FINISH:
                    $response = $this->finish();
                    break;
                case self::ACTION_INIT:
                    $response = $this->request(RpcMethod::INIT);
                    break;
                case self::ACTION_AUTH:
                    return $this->startAuth();
            }
        } catch (\Error $e) {
            $response = $e->getMessage();
        }

        return \json_encode($response, \JSON_PRETTY_PRINT);
    }

    public function clearLinkings(): string
    {
        $this->fullResponse = false;
        $response           = $this->clear();
        return $response ? 'Linkings cleared' : 'Failed to clear linkings';
    }

    public function triggerAck(string $controller, string $pullResult): string
    {
        /** @var Identity $identities */
        $identities = [];
        $models     = \json_decode($pullResult, true);
        if (\is_bool($models['result']) || empty($models['result']) || $models === null || empty($pullResult)) {
            return 'Data needs to be pulled first';
        }

        foreach ($models['result'] as $model) {
            $id           = \rand();
            $identity     = new Identity($model['id'][0], $id);
            $identities[] = $identity;
        }
        $ack = new Ack();
        $ack->setIdentities([\ucfirst($controller) => $identities]);

        try {
            $response = $this->ack($ack);
        } catch (\Error $e) {
            $response = $e;
        }

        return \json_encode($response, \JSON_PRETTY_PRINT);
    }

    public function startAuth(): string
    {
        $this->authenticate();
        $_SESSION['sessionId'] = $this->sessionId;
        return "Authentication successful, Session ID: " . $this->sessionId;
    }

    public function getSkeleton($controller): string
    {
        $className = \sprintf('Jtl\\Connector\\Core\\Model\\%s', \ucfirst($controller));

        try {
            $class = new $className();
        } catch (\Error $e) {
            return 'No Model available for ' . $controller . ' controller';
        }

        return \json_encode($this->getSerializer()->toArray($class), \JSON_PRETTY_PRINT);
    }

    public function fromJson($controller, $payload)
    {
        $payload = \json_decode($payload, \JSON_OBJECT_AS_ARRAY);
        $data    = $this->getSerializer()->toArray($payload);
        return $this->requestAndPrepare($controller, 'clear', $data);
    }

    public function modelPush()
    {
        //TODO: implement model push method.
    }

    public function pushTest(): string
    {
        //TODO: add image push
        $response = [];
        $json     = \file_get_contents('src/pushTest.json');
        $payloads = \json_decode($json, true);
        foreach ($payloads as $payload) {
            $method            = $payload['method'];
            $params            = \is_null($payload['params']) ? [] : $payload['params'];
            $response[$method] = $this->request($method, $params);
        }

        return \json_encode($response, \JSON_PRETTY_PRINT);
    }

    public function disconnect(): void
    {
        \session_unset();
    }
}
