<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Client\ResponseException;
use Jtl\Connector\Core\Model\Identities;
use Jtl\Connector\Core\Model\Identity;
use Jtl\ConnectorTester\TimedClient;

class LinkingsController extends TimedClient
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
     * @throws \JsonException
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

        return $response ? $response : "Couldn't clear Linkings";
    }
}
