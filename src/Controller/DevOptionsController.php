<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Model\Ack;
use Jtl\Connector\Core\Model\Identity;
use Jtl\Connector\Core\Model\ProductImage;

class DevOptionsController extends ConnectorClient
{
    /**
     * @var string
     */
    private string $response;

    /**
     * @param string $token
     * @param string $endpointUrl
     * @param HttpClient|null $httpClient
     */
    public function __construct(string $token, string $endpointUrl, HttpClient $httpClient = null)
    {
        parent::__construct($token, $endpointUrl, $httpClient);
        $this->sessionId = $_SESSION['sessionId'] ?? '';
        $this->setFullResponse(true);
    }

    /**
     * @param string $controller
     * @param string $pullResult
     * @return string
     */
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
            $this->setResponse(\json_encode($this->ack($ack), \JSON_PRETTY_PRINT));
        } catch (\Error $e) {
            $this->setResponse($e);
        }

        return $this->getResponse();
    }

    /**
     * @param string $controller
     * @return string
     */
    public function getSkeleton(string $controller): string
    {
        $className = \sprintf('Jtl\\Connector\\Core\\Model\\%s', \ucfirst($controller));

        try {
            $class = new $className();
        } catch (\Error $e) {
            $this->setResponse('No Model available for ' . $controller . ' controller');
            return $this->getResponse();
        }

        $this->setResponse(\json_encode([$this->getSerializer()->toArray($class)], \JSON_PRETTY_PRINT));

        return $this->getResponse();
    }

    /**
     * @return string
     * @throws GuzzleException
     */
    public function pushTest(): string
    {
        $response = [];
        $json     = \file_get_contents(__DIR__ . '/../pushTest.json');
        $payloads = \json_decode($json, true);
        foreach ($payloads as $payload) {
            $method = $payload['method'];
            $params = \is_null($payload['params']) ? [] : $payload['params'];
            if ($payload['method'] === 'image.push') {
                $images = [];
                foreach ($params as $item) {
                    /** @var $image ProductImage */
                    $image = $this->getSerializer()->fromArray($item, 'Jtl\Connector\Core\Model\AbstractImage');
                    $image->setFilename(\realpath(__DIR__ . '/../../assets/' . $image->getFilename()));
                    $images[] = $image;
                }
                $response[$method] = $this->push('image', $images);
            } else {
                $response[$method] = $this->request($method, $params);
            }
        }
        $foo = 'bar';
        return \json_encode($response, \JSON_PRETTY_PRINT);
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
     * @return DevOptionsController
     */
    public function setResponse(string $response): DevOptionsController
    {
        $this->response = $response;
        return $this;
    }
}
