<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Core\Model\Ack;
use Jtl\Connector\Core\Model\Identity;
use Jtl\Connector\Core\Model\ProductImage;
use Jtl\ConnectorTester\ConnectorTesterClient;

class DevOptionsController extends ConnectorTesterClient
{
    /**
     * @param string $controller
     * @param string $pullResult
     * @return string
     * @throws \JsonException
     */
    public function triggerAck(string $controller, string $pullResult): string
    {
        $identities = [];
        $models     = \json_decode($pullResult, true);
        if (!\is_array($models) || \is_bool($models['result']) || empty($pullResult)) {
            return 'Data needs to be pulled first';
        }

        foreach ($models['result'] as $model) {
            $id                        = \rand();
            $identity                  = new Identity($model['id'][0], $id);
            $identities[$controller][] = $identity;
        }
        $ack = new Ack();
        $ack->setIdentities($identities);


        return \json_encode($this->ack($ack), \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @param bool $payloadGenerator
     * @return string
     * @throws \JsonException
     */
    public function getSkeleton(string $controller, bool $payloadGenerator = false): string
    {
        $className = \sprintf('Jtl\\Connector\\Core\\Model\\%s', \ucfirst($controller));

        try {
            $class = new $className();
        } catch (\Error $e) {
            return 'No Model available for ' . $controller . ' controller';
        }

        if ($payloadGenerator) {
            return $this->getArrayFillingSerializer()->serialize($class, 'json');
        }

        return \json_encode(
            [$this->getArrayFillingSerializer()->toArray($class)],
            \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR
        );
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
                /** @var array{} $params */
                $response[$method] = $this->request($method, $params);
            }
        }
        return \json_encode($response, \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }

    /**
     * @param string $controller
     * @param bool $generateRandomData
     * @return string
     * @throws \JsonException
     */
    public function generatePayload(string $controller, bool $generateRandomData): string
    {
        //get the desired class empty/default values
        $skeleton = $this->getSkeleton($controller, true);

        //if no random data should be generated, return json
        if (!$generateRandomData) {
            return $skeleton;
        }

        //TODO: generate fake data using modelFactories
        return '';
    }
}
