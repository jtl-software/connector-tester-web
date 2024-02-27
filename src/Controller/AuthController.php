<?php

namespace Jtl\ConnectorTester\Controller;

use Jtl\Connector\Client\ResponseException;
use Jtl\ConnectorTester\ConnectorTesterClient;

class AuthController extends ConnectorTesterClient
{
    /**
     * @return string
     * @throws \JsonException
     */
    public function startAuth(): string
    {
        try {
            $this->authenticate();
        } catch (ResponseException $e) {
            return 'Error: ' . $e->getMessage();
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
