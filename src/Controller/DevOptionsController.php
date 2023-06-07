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
     * @throws \JsonException
     */
    public function triggerAck(string $controller, string $pullResult): string
    {
        /** @var array<string, Identity> | array{} $identities */
        $identities = [];
        $models     = \json_decode($pullResult, true);
        if (!\is_array($models) || \is_bool($models['result']) || empty($pullResult)) {
            return 'Data needs to be pulled first';
        }

        foreach ($models['result'] as $model) {
            $id                                = \rand();
            $identity                          = new Identity($model['id'][0], $id);
            $identities[\ucfirst($controller)] = $identity;
        }
        $ack = new Ack();
        $ack->setIdentities($identities);


        return \json_encode($this->ack($ack), \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @return string
     * @throws \JsonException
     */
    public function getSkeleton(string $controller): string
    {
        $className = \sprintf('Jtl\\Connector\\Core\\Model\\%s', \ucfirst($controller));

        try {
            $class = new $className();
        } catch (\Error $e) {
            return 'No Model available for ' . $controller . ' controller';
        }

        return \json_encode([$this->getSerializer()->toArray($class)], \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }

    /**
     * @return string
     * @throws GuzzleException
     * @throws \JsonException
     */
    public function pushTest(): string
    {
        $response = [];
        $json     = \file_get_contents(__DIR__ . '/../pushTest.json');

        if ($json === false) {
            return "Couldn't access 'pushTest.json' file";
        }

        /** @var array<int, array{method: string, params: null|array<mixed>, jtlrpc: numeric-string, id: string}> $payloads */
        $payloads = \json_decode($json, true, flags: \JSON_THROW_ON_ERROR);
        foreach ($payloads as $payload) {
            $method = $payload['method'];
            $params = \is_null($payload['params']) ? [] : $payload['params'];
            if ($payload['method'] === 'image.push') {
                $images = [];
                /** @var array{filename: string, name: string, foreignKey: array{0: numeric-string, 1: int}, id: array{0: numeric-string, 1: int}, relationType: string, sort: int, i18ns: array<mixed>} $item */
                foreach ($params as $item) {
                    /** @var ProductImage $image */
                    $image    = $this->getSerializer()->fromArray($item, 'Jtl\Connector\Core\Model\AbstractImage');
                    $filePath = \realpath(__DIR__ . '/../../assets/' . $image->getFilename());

                    if ($filePath === false) {
                        return "Couldn't resolve filepath";
                    }

                    $image->setFilename($filePath);
                    $images[] = $image;
                }
                $response[$method] = $this->push('image', $images);
            } else {
                $response[$method] = $this->request($method, $params);
            }
        }
        return \json_encode($response, \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }
}
