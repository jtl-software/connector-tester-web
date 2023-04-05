$(document).ready(function () {
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

    handleDeleteConnectionButton();
    handleAuthentication();
}

function deleteConnectionFromLocalStorage() {
    const selectedConnection = $('#connectorDropdown :selected').attr('id');
    const connectionDeletedAlert = $('#connectionDeleted');

    localStorage.removeItem(selectedConnection);
    buildConnectorDropDownOptions();
    fillTokenField();
    connectionDeletedAlert.show().fadeOut(3000);

    handleDeleteConnectionButton();
    handleAuthentication(true);
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

    if (firstEntry !== null) {
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

function handleDeleteConnectionButton() {
    const deleteButton = $('#deleteConnection');
    const tokenField = $('#connectorToken');

    if (localStorage.key(0) === null) {
        deleteButton.addClass('d-none');
        tokenField.val('');
    } else {
        deleteButton.removeClass('d-none');
    }
}

function fillResultWindow(response) {
    $('#results').val(response);
}

function handleControls(disableButton) {
    const controls = $('#controls :input');
    const connector = $('#connectorDropdown');

    if (!disableButton) {
        controls.attr('disabled', false);
        connector.attr('disabled', true);
    } else if (disableButton) {
        controls.attr('disabled', true);
        connector.attr('disabled', false);
    }
}

function handleAuthentication(disableButton = null) {
    const button = $('#authenticate');
    const results = $('#results');

    localStorage.key(0) === null ? button.attr('disabled', true) : button.attr('disabled', false);

    if (disableButton === false) {
        button.val('authenticated');
        button.text('Disconnect');
        handleControls(false);
    } else if (disableButton === true) {
        button.val('notAuthenticated');
        button.text('Authenticate');
        results.val('');
        handleControls(true);
    }
}

function submitForm(target) {
    const connector = $('#connectorDropdown');
    connector.attr('disabled', false);

    const formData = $('#mainForm').serialize() + '&operation=' + target;

    $.post('action.php?XDEBUG_SESSION_START=PHPSTORM', formData, function (response) {
        fillResultWindow(response);
    })

    connector.attr('disabled', true);
}

function registerEvents() {
    buildConnectorDropDownOptions();
    buildActionDropDownOptions();
    fillTokenField();
    handleDeleteConnectionButton();
    handleAuthentication();

    $('#triggerAction').on('click', function () {
        submitForm('triggerAction');
    })
    $('#triggerAck').on('click', function () {
        submitForm('triggerAck');
    })
    $('#clearLinkings').on('click', function () {
        submitForm('clearLinkings');
    })
    $('#fromJson').on('click', function () {
        submitForm('fromJson');
    })
    $('#getSkeleton').on('click', function () {
        submitForm('getSkeleton');
    })
    $('#pushTest').on('click', function () {
        submitForm('pushTest');
    })
    $('#modelPush').on('click', function () {
        submitForm('modelPush');
    })
    $('#authenticate').on('click', function () {
        const button = $('#authenticate');

        if (button.val() === 'notAuthenticated') {
            submitForm('authenticate');
            handleAuthentication(false);
        } else {
            handleAuthentication(true);
        }
    })

    $('#submitNewConnection').on('click', function () {
        saveConnectionToLocalStorage();
    })

    $('#deleteConnection').on('click', function () {
        deleteConnectionFromLocalStorage();
    })
}