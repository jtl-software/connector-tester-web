<?php

namespace Jtl\ConnectorTester;

use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\GuzzleException;
use Jtl\Connector\Client\ConnectorClient;

class TimedClient extends ConnectorClient
{
    /**
     * @param string $token
     * @param string $endpointUrl
     * @param HttpClient|null $httpClient
     * @return void
     */
    public function __construct(string $token, string $endpointUrl, HttpClient $httpClient = null)
    {
        parent::__construct($token, $endpointUrl, $httpClient);
        $this->sessionId = $_SESSION['sessionId'] ?? '';
        $this->setResponseFormat(self::RESPONSE_FORMAT_ARRAY);
        $this->setFullResponse(true);
    }

    /**
     * @param string $method
     * @param array<string, int|string> $params
     * @param bool $authRequest
     * @param string|null $zipFile
     * @return mixed
     * @throws GuzzleException
     */
    protected function request(
        string $method,
        array $params = [],
        bool $authRequest = false,
        string $zipFile = null
    ): mixed {
        $start  = \microtime(true);
        $result = parent::request($method, $params, $authRequest, $zipFile);
        $end    = \microtime(true);
        $time   = ($end * 1000) - ($start * 1000);
        \header('X-Request-Time: ' . $time);
        return $result;
    }
}
