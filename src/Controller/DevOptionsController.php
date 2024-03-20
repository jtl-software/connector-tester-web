<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Core\Model\Ack;
use Jtl\Connector\Core\Model\Generator\AbstractModelFactory;
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
     * @return string
     * @throws \JsonException
     */
    public function getSkeleton(string $controller): string
    {
        // imageClasses share the same model, they just differentiate in "relationType" property.
        // that's why we're choosing categoryImage as default
        if ($controller === 'image') {
            $controller = 'categoryImage';
        }
        $className = \sprintf('Jtl\\Connector\\Core\\Model\\%s', \ucfirst($controller));

        try {
            $class = new $className();
        } catch (\Error $e) {
            return 'No Model available for ' . $controller . ' controller';
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
     * @param array<string, string> $optionalProperties
     * @return string
     * @throws \JsonException
     */
    public function generatePayload(string $controller, bool $generateRandomData, array $optionalProperties): string
    {
        //get the desired class empty/default values
        $skeleton = $this->getSkeleton($controller);

        //if no random data should be generated, return json
        if (!$generateRandomData) {
            return $this->filterOptionalProperties($skeleton, $optionalProperties);
        }

        $factoryName = \sprintf('Jtl\\Connector\\Core\\Model\\Generator\\%sFactory', \ucfirst($controller));

        try {
            /** @var AbstractModelFactory $factory */
            $factory = new $factoryName();
        } catch (\RuntimeException $e) {
            return $e->getMessage();
        }

        return $this->filterOptionalProperties(
            \json_encode($factory->makeArray(1), \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR),
            $optionalProperties
        );
    }

    /**
     * @param string $payload
     * @param array<string, string> $optionalProperties
     * @return string
     * @throws \JsonException
     */
    public function filterOptionalProperties(string $payload, array $optionalProperties): string
    {
        $unfilteredArray = \json_decode($payload, true);

        //double check so phpstan shuts up
        if (!\is_array($unfilteredArray)) {
            throw new \RuntimeException('Expected an array from JSON payload');
        }

        //if the optional property is not selected, make it an empty array
        foreach ($optionalProperties as $key => $optionalProperty) {
            if (
                \array_key_exists($key, $unfilteredArray[0])
                && !\filter_var($optionalProperty, \FILTER_VALIDATE_BOOL)
            ) {
                $unfilteredArray[0][$key] = [];
            }
        }

        return \json_encode($unfilteredArray, \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR);
    }
}
