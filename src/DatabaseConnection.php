<?php

namespace Jtl\ConnectorTester;

class DatabaseConnection
{
    /**
     * @var \PDO
     */
    private \PDO $pdo;

    /**
     * @return \PDO
     */
    public function connect(): \PDO
    {
            $this->pdo = new \PDO('sqlite:' . __DIR__ . '/../config/connections.db');

        return $this->pdo;
    }
}