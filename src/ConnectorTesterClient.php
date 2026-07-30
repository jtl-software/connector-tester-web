<?php

declare(strict_types=1);

namespace Jtl\ConnectorTester;

use Doctrine\Common\Annotations\AnnotationRegistry;
use GuzzleHttp\Client as HttpClient;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use JMS\Serializer\EventDispatcher\EventDispatcher;
use JMS\Serializer\Serializer;
use Jtl\Connector\Client\ConnectorClient;
use Jtl\Connector\Core\Serializer\SerializerBuilder;
use Jtl\ConnectorTester\Serializer\DynamicArrayFillerSubscriber;

class ConnectorTesterClient extends ConnectorClient
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
        array  $params = [],
        bool   $authRequest = false,
        string $zipFile = null
    ): mixed {
        $start = \microtime(true);

        try {
            $result = parent::request($method, $params, $authRequest, $zipFile);
        } catch (ConnectException $exception) {
            $result = $this->retryWithSystemResolvedHost($exception, $method, $params, $authRequest, $zipFile);
        }

        $end  = \microtime(true);
        $time = ($end * 1000) - ($start * 1000);
        \header('X-Request-Time: ' . $time);
        return $result;
    }

    /**
     * Desktop-only DNS fallback - see {@see DesktopDnsFallback} for the underlying
     * (independently unit-tested) decision logic and why each guard exists.
     *
     * This is a strict no-op (rethrows immediately, unchanged behaviour) whenever:
     *  - curl was not built against c-ares (the web deployment's Homebrew/system
     *    PHP already uses the system resolver, so it never hits this code path).
     *  - the failure wasn't a pure resolution failure (curl errno !== 6 /
     *    CURLE_COULDNT_RESOLVE_HOST - e.g. connection refused or a timeout are
     *    left untouched).
     *  - the host is already a literal IP, or gethostbyname() can't resolve it
     *    either.
     *  - a zip upload was in flight (`$zipFile`): the parent request already
     *    deleted the temp file in its `finally` block on the first attempt, so a
     *    multipart retry would fail regardless; the original DNS error is more
     *    useful here.
     *
     * Because it only engages after curl has already failed, it never changes
     * behaviour for hosts that resolve normally (public internet hosts included) -
     * it only rescues the specific case that is otherwise unrecoverable.
     *
     * @param array<string, int|string> $params
     * @throws ConnectException
     * @throws GuzzleException
     */
    private function retryWithSystemResolvedHost(
        ConnectException $exception,
        string           $method,
        array            $params,
        bool             $authRequest,
        ?string          $zipFile
    ): mixed {
        if ($zipFile !== null) {
            throw $exception;
        }

        if (!DesktopDnsFallback::isCurlBuiltWithCAres(\curl_version())) {
            throw $exception;
        }

        if (!DesktopDnsFallback::isDnsResolutionFailure($exception->getHandlerContext()['errno'] ?? null)) {
            throw $exception;
        }

        $host = \parse_url($this->endpointUrl, \PHP_URL_HOST);
        if (!\is_string($host)) {
            throw $exception;
        }

        $resolved = DesktopDnsFallback::resolveHostViaSystemResolver($host);
        if ($resolved === null) {
            throw $exception;
        }

        $port              = DesktopDnsFallback::resolvePort($this->endpointUrl);
        $config            = DesktopDnsFallback::withCurlResolveOverride(
            $this->httpClient->getConfig(),
            $host,
            $port,
            $resolved
        );
        $this->httpClient = new HttpClient($config);

        return parent::request($method, $params, $authRequest, $zipFile);
    }

    /**
     * @return Serializer
     */
    protected function getArrayFillingSerializer(): Serializer
    {
        AnnotationRegistry::registerLoader('class_exists');
        $this->serializer = SerializerBuilder::create()
            ->configureListeners(function (EventDispatcher $dispatcher) {
                $dispatcher->addSubscriber(new DynamicArrayFillerSubscriber());
            })
            ->build();

        return $this->serializer;
    }
}
