<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Model\Identities;
use Jtl\Connector\Core\Model\Identity;

class LinkingsController extends ConnectorClient
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
    }

    /**
     * @return string
     */
    public function clearLinkings(): string
    {
        $this->setResponse($this->clear());
        return \json_encode($this->getResponse() ? 'Linkings cleared' : 'Failed to clear linkings');
    }

    /**
     * @param string $controller
     * @param string $payload
     * @return string
     */
    public function clearLinkingsFromJson(string $controller, string $payload): string
    {
        $this->setFullResponse(true);
        $identities      = new Identities();
        $identitiesArray = [];
        $payload         = \json_decode($payload, \JSON_OBJECT_AS_ARRAY);

        foreach ($payload as $item) {
            $identity                       = new Identity($item[0], $item[1]);
            $identitiesArray[$controller][] = $identity;
        }

        $identities->setIdentities($identitiesArray);
        return \json_encode($this->clearFromJson($identities), \JSON_PRETTY_PRINT);
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
     * @return LinkingsController
     */
    public function setResponse(string $response): LinkingsController
    {
        $this->response = $response;
        return $this;
    }
}
