<?php

namespace Jtl\ConnectorTester\Controller;

use GuzzleHttp\Client as HttpClient;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Client\ResponseException;

class AuthController extends ConnectorClient
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
     * @throws \JsonException
     */
    public function startAuth(): string
    {
        try {
            $this->authenticate();
        } catch (ResponseException $e) {
            return  'Error: ' . $e->getMessage();
        }
        $_SESSION['sessionId'] = $this->sessionId;
        return \json_encode("Authentication successful, Session ID: " . $this->sessionId, \JSON_THROW_ON_ERROR);
    }

    /**
     * @return void
     */
    public function disconnect(): void
    {
        \session_unset();
    }
}
