<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Model\Identities;
use Jtl\Connector\Core\Model\Identity;

class LinkingsController extends ConnectorClient
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
    }

    /**
     * @return string
     */
    public function clearLinkings(): string
    {
        $response = $this->clear();
        return $response ? 'Linkings cleared' : 'Failed to clear linkings';
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     * @throws GuzzleException
     */
    public function clearLinkingsFromJson(string $controller, string $payload): string
    {
        $this->setFullResponse(true);
        $identities      = new Identities();
        $identitiesArray = [];
        $payload         = \json_decode($payload, true, 512, \JSON_OBJECT_AS_ARRAY);

        /** @var array<int, array{0: numeric-string, 1: int}> $payload */
        foreach ($payload as $item) {
            $identitiesArray[] = new Identity($item[0], $item[1]);
        }
        $identities->setIdentities($identitiesArray);

        $response = \json_encode($this->clearFromJson($identities, $controller), \JSON_PRETTY_PRINT);

        return $response ? $response : "Couldn't clear Linkings";
    }
}
