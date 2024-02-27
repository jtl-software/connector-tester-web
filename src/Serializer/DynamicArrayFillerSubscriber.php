<?php

namespace Jtl\ConnectorTester\Serializer;

use JMS\Serializer\EventDispatcher\EventSubscriberInterface;
use JMS\Serializer\EventDispatcher\PreSerializeEvent;

class DynamicArrayFillerSubscriber implements EventSubscriberInterface
{
    /**
     * @return array<int, array<string, string>>
     */
    public static function getSubscribedEvents(): array
    {
        return [
            [
                'event' => 'serializer.pre_serialize',
                'method' => 'onPreSerialize',
                'format' => 'json',
            ]
        ];
    }

    /**
     * @param PreSerializeEvent $event
     * @return void
     */
    public function onPreSerialize(PreSerializeEvent $event): void
    {
        $object        = $event->getObject();
        $classMetadata = $event->getContext()->getMetadataFactory()->getMetadataForClass(\get_class($object));

        foreach ($classMetadata->propertyMetadata as $propertyMetadata) {
            $propertyName  = $propertyMetadata->name;
            $propertyValue = $propertyMetadata->defaultValue;

            // Check if the property is an empty array
            if (\is_array($propertyValue) && empty($propertyValue)) {
                $className = $propertyMetadata->type['params'][0]['name'];
                // Instantiate property Object and use setter
                $newObject = new $className();
                $setter    = 'set' . \ucfirst($propertyName);
                $object->$setter($newObject);
            }
        }
    }
}
