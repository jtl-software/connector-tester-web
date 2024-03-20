<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ResponseException;
use Jtl\Connector\Core\Model\Identity;
use Jtl\ConnectorTester\ConnectorTesterClient;

class LinkingsController extends ConnectorTesterClient
{
    /**
     * @return string
     */
    public function clearLinkings(): string
    {
        $this->setFullResponse(false);

        try {
            $this->clear();
        } catch (ResponseException $e) {
            return $e->getMessage();
        }
        return 'Linkings cleared';
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     * @throws \JsonException|GuzzleException
     */
    public function clearLinkingsFromJson(string $controller, string $payload): string
    {
        if (empty($payload)) {
            return 'A payload is needed to clear linkings from json';
        }

        $this->setFullResponse(true);
        $identitiesArray = [];
        $payload         = \json_decode($payload, true, flags: \JSON_OBJECT_AS_ARRAY | \JSON_THROW_ON_ERROR);

        /** @var array<int, array{0: numeric-string, 1: int}> $payload */
        foreach ($payload as $item) {
            $identitiesArray[] = new Identity($item[0], $item[1]);
        }

        $response = \json_encode(
            $this->clearFromJson($controller, ...$identitiesArray),
            \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR
        );

        return $response ? $response : "Couldn't clear linkings";
    }

    /**
     * @param string $controller
     * @return string
     * @throws \JsonException|GuzzleException
     */
    public function clearControllerLinkings(string $controller): string
    {
        $this->setFullResponse(true);
        $response = \json_encode(
            $this->clearFromJson($controller, new Identity()),
            \JSON_PRETTY_PRINT | \JSON_THROW_ON_ERROR
        );

        return $response ? $response : "Couldn't clear linkings";
    }
}
