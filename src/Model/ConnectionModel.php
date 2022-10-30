<?php

namespace Jtl\ConnectorTester\Model;

class ConnectionModel
{
    /**
     * @var string|null
     */
    public ?string $name;

    /**
     * @var string
     */
    public string $token;

    /**
     * @var string
     */
    public string $url;

    /**
     * @return string|null
     */
    public function getName(): ?string
    {
        return $this->name;
    }

    /**
     * @param string|null $name
     * @return ConnectionModel
     */
    public function setName(?string $name): ConnectionModel
    {
        $this->name = $name;
        return $this;
    }

    /**
     * @return string
     */
    public function getToken(): string
    {
        return $this->token;
    }

    /**
     * @param string $token
     * @return ConnectionModel
     */
    public function setToken(string $token): ConnectionModel
    {
        $this->token = $token;
        return $this;
    }

    /**
     * @return string
     */
    public function getUrl(): string
    {
        return $this->url;
    }

    /**
     * @param string $url
     * @return ConnectionModel
     */
    public function setUrl(string $url): ConnectionModel
    {
        $this->url = $url;
        return $this;
    }

}