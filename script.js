$(document).ready(function () {
    if (localStorage.key(0) !== null) {
        $('#deleteConnection').removeClass('d-none');
    }
    registerEvents();
});

function saveConnectionToLocalStorage() {
    const name = $('#newConnectionName').val();
    const url = $('#newConnectionUrl').val();
    const token = $('#newConnectionToken').val();
    const saveAlert = $('#savedSuccessfully');
    const saveFailedAlert = $('#failedToSave');
    const missingInputAlert = $('#missingInput');
    const deleteButton = $('#deleteConnection');

    const keys = ['url', 'token'];
    const values = [url, token];
    const object = {};

    for (let i = 0; i < keys.length; i++) {
        object[keys[i]] = values[i];
    }

    if (localStorage.getItem(name) === null && name) {
        localStorage.setItem(name, JSON.stringify(object));
        saveAlert.show().fadeOut(3000);
        buildConnectorDropDownOptions();
        fillTokenField();
        deleteButton.removeClass('d-none');

    } else if (!name || !url || !token) {
        missingInputAlert.show().fadeOut(3000);
    } else {
        saveFailedAlert.show().fadeOut(3000);
    }
}

function deleteConnectionFromLocalStorage() {
    const selectedConnection = $('#connectorDropdown :selected').attr('id');
    const deleteButton = $('#deleteConnection');
    const connectionDeletedAlert = $('#connectionDeleted');
    const tokenField = $('#connectorToken');

    localStorage.removeItem(selectedConnection);
    buildConnectorDropDownOptions();
    fillTokenField();
    connectionDeletedAlert.show().fadeOut(3000);
    if (localStorage.key(0) === null) {
        deleteButton.addClass('d-none');
        tokenField.val('');
    }
}

function buildConnectorDropDownOptions() {
    const connections = {...localStorage};
    const connectorDropdown = $('#connectorDropdown');
    connectorDropdown.empty();

    $.each(connections, function (key, value) {
        const values = JSON.parse(value);
        connectorDropdown.append(`<option value="${values.url}" id="${key}">${key} | ${values.url}</option>`)
    })
}

function fillTokenField() {
    const tokenField = $('#connectorToken');
    const selectedConnector = $('#connectorDropdown');
    const connections = {...localStorage};
    const firstEntry = localStorage.key(0)

    if ( firstEntry !== null){
        tokenField.val(JSON.parse(localStorage.getItem(firstEntry)).token);
    }

    selectedConnector.on('change', function () {
        $.each(connections, function (key, value) {
            const values = JSON.parse(value);
            if (selectedConnector.val() === values.url) {
                tokenField.val(values.token);
            }
        })
    })
}


function buildActionDropDownOptions() {
    const controllers = {
        category: ['Pull', 'Push', 'Delete', 'Stats'],
        connector: ['Finish', 'Identify'],
        core: ['Auth', 'Ack', 'Clear', 'Features', 'Init'],
        crossSelling: [''],
        customer: ['Pull', 'Push', 'Stats'],
        customerOrder: ['Pull', 'Stats'],
        deliveryNote: ['Push'],
        globalData: ['Pull', 'Stats'],
        image: ['Pull', 'Push', 'Delete', 'Stats'],
        manufacturer: ['Pull', 'Push', 'Delete', 'Stats'],
        payment: ['Pull', 'Stats'],
        product: ['Pull', 'Push', 'Delete', 'Stats'],
        productPrice: ['Pull', 'Push', 'Stats'],
        productPriceLevel: ['Pull', 'Push', 'Stats'],
        specific: ['Pull', 'Push', 'Delete', 'Stats'],
        statusChange: ['Push']
    }

    const controllerDropdown = $('#controllerDropdown')
    let selectedController = controllerDropdown.val();

    for (let value of controllers[selectedController]) {
        $('#actionDropdown').append(`<option value="${value}">${value}</option>`);
    }

    $(controllerDropdown).change(function () {
        $('#actionDropdown').empty();
        selectedController = $(controllerDropdown).val();
        buildActionDropDownOptions();
    })
}

function registerEvents() {
    buildConnectorDropDownOptions();
    buildActionDropDownOptions();
    fillTokenField();

    $('#triggerAction').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=triggerAction';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#triggerAck').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=triggerAck';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#clearLinkings').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=clearLinkings';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#fromJson').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=fromJson';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#getSkeleton').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=getSkeleton';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#pushTest').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=pushTest';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#modelPush').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=modelPush';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#authenticate').on('click', function (e) {
        const formData = $('#mainForm').serialize() + '&operation=authenticate';
        $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
            fillResultWindow(response);
        })
    })
    $('#submitNewConnection').on('click', function (e) {
        saveConnectionToLocalStorage();
    })
    $('#deleteConnection').on('click', function (e) {
        deleteConnectionFromLocalStorage();
    })
}

function fillResultWindow(response) {
    $('#results').val(response);
}