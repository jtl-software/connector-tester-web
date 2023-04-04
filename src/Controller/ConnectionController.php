<?php

declare(strict_types=1);

namespace Jtl\ConnectorTester\Controller;

use Jtl\ConnectorTester\DatabaseConnection;
use Jtl\ConnectorTester\Model\ConnectionModel;

class ConnectionController
{
    protected \PDO $pdo;

    /**
     * Establish database connection
     */
    public function __construct()
    {
        $connection = new DatabaseConnection();
        $this->pdo  = $connection->connect();

        $sql = "CREATE TABLE IF NOT EXISTS connections (name TEXT, url TEXT, token TEXT)";
        $this->pdo->exec($sql);
    }

    /**
     * @param string|null $name
     * @param string $token
     * @param string $url
     * @return void
     */
    public function newConnection(?string $name, string $token, string $url): void
    {
        $sql = \sprintf(
            "INSERT INTO connections (name, url, token) VALUES ('%s', '%s', '%s')",
            $name,
            $url,
            $token
        );
        $this->pdo->query($sql);
    }


    /**
     * @return ConnectionModel[]
     */
    public function fetchConnections(): array
    {
        $sql     = "SELECT * FROM connections";
        $stmt    = $this->pdo->query($sql);
        $fetched = $stmt->fetchAll($this->pdo::FETCH_ASSOC);
        $results = [];

        foreach ($fetched as $item) {
            $model = new ConnectionModel();
            $model
                ->setName($item['name'])
                ->setToken($item['token'])
                ->setUrl($item['url']);
            $results[] = $model;
        }

        return $results;
    }
}
