# JTL Connector Tester

The JTL Connector Tester lets you send RPC calls and view the responses. It can be used to test the functionality of connectors using the JTL connector core.

## Features

- Push data
- Pull
- Delete data
- Stats
- Features
- Init
- Identify
- Finish
- Clear all Linkings
- Clear linkings from json
- Trigger Ack
- Get Skeleton 
- Push Test 

## Requirements
- PHP 8.2
- Composer (if building from source)
- Node.js (if building from source)

## How to install locally
#### From Source:
1. Run `composer install` inside the root directory
2. Run `npm install` inside the frontend directory
3. Run `npm run build` inside the frontend directory
4. Point your domain to the public directory inside the root folder.

#### From release
1. Download the latest release file (https://github.com/jtl-software/connector-tester-web/releases/latest)
2. Upload the extracted files to your server
3. Point your domain to the public directory inside the root folder.

## How to use it

1. Enter your connector credentials using the credentials button at the top left.
2. Select the desired credentials from the select field at the top (Active Connection) and click on Authenticate
3. Select the desired controller from the select field under the result field.
4. Select the desired Action from the select field under the payload field.
5. Click on the green trigger action button.

**Push, delete and clear linkings from json methods need payloads**

### Push
This will send data to the connector using the previously selected controller. It needs a payload. The get skeleton method can help building the payload.


Example payload for category push:
```
[
    {
      "id": [
        "",
        12345
      ],
      "parentCategoryId": [
        "",
        0
      ],
      "isActive": false,
      "level": 0,
      "sort": 0,
      "attributes": [],
      "customerGroups": [],
      "i18ns": [
        {
          "categoryId": [
            "",
            12345
          ],
          "description": "",
          "languageISO": "ger",
          "metaDescription": "",
          "metaKeywords": "",
          "name": "Sportbekleidung",
          "titleTag": "Sportbekleidung",
          "urlPath": "Sportbekleidung-Katalog"
        }
      ],
      "invisibilities": []
    }
]
```

### Pull
This will get all data that hasn't been pulled yet. This method will not send an ACK so it can be pulled as often as required.

### Delete
This will delete data using the previously selected controller from the connected shop system. It needs a payload.

Example payload for category delete:
```
{
    "category": {
        "id": ["123", 0]
    }
}
```

### Stats
This will get statistics data for the previously selected controller.

### Features
This will get all features (for example pull and push) and their current state.

## Clear Linkings

### Clear all
This will clear all linkings from all linking tables!

### Clear from json
This will clear only selected linkings from the previously selected controller. It needs a payload. This will only work for Connector Core 5.*

Example payload:
```
[
	["123", 0],
	["321", 0]
]
```

## Dev Options

### Trigger Ack
This will send an ACK to all previously pulled data. Data needs to be pulled first!

### Manual Ack
This will send an ACK for chosen data using the selected controller. It needs a payload.
First Entry of the array needs to be the endpoint id. Second entry is optional, it's used for the host id.

Example payload:
```
[
    ["123", 1234], --> endpoint id and host id are given
    ["321"] --> only endpoint id is given, host id will be randomly generated
]
```

### Get Skeleton
The Get Skeleton method will return an empty model of the previously selected controller. It's useful if you want to build a payload for the push method.

### Push Test
This will start return the results of a feature call and start a push for the manufacturer, category, product and image controller using already prepared example data.