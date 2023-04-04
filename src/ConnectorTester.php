<?php

namespace Jtl\ConnectorTester;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Definition\RpcMethod;

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
        ACTION_ACK      = 'Ack',
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
                    $this->fullResponse = false;
                    $response           = $this->delete($controller, $payload);
                    break;
                case self::ACTION_STATS:
                    $response = $this->request($controller . '.statistic', ['limit' => 0]);
                    break;
                case self::ACTION_IDENTIFY:
                    $response = $this->identify()->getPlatformName();
                    break;
                case self::ACTION_FEATURES:
                    $response = $this->request(RpcMethod::FEATURES);
                    break;
                case self::ACTION_CLEAR:
                    $this->fullResponse = false;
                    $response           = $this->clear();
                    break;
                case self::ACTION_FINISH:
                    $response = $this->finish();
                    break;
                case self::ACTION_ACK:
                    $response = $this->Ack();
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

    public function getSkeleton($controller): string
    {
        $skeleton = 'Jtl\\Connector\\Core\\Model\\' . \ucfirst($controller);

        try {
            $class = new $skeleton();
        } catch (\Error $e) {
            return 'No Model available for ' . $controller . ' controller';
        }

        return \json_encode($this->getSerializer()->toArray($class), \JSON_PRETTY_PRINT);
    }

    public function fromJson($controller, $payload)
    {
        //TODO: implement clear linkings from json method
    }

    public function clearLinkings(): bool
    {
        $this->fullResponse = false;
        return $this->clear();
    }

    public function modelPush()
    {
        //TODO: implement model push method.
    }

    public function pushTest()
    {
        //TODO: implement push test method.
    }

    public function startAuth(): string
    {
        //TODO: save session
        $this->authenticate();
        return "Authentication successful, Session ID: " . $this->sessionId;
    }
}
