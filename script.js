$(document).ready(function () {
    fetchConnections()
    saveConnection()
    buildActionDropDownOptions()
    registerEvents()
});

function saveConnection()
{
    const saveAlert       = $('#savedSuccessfully');
    const saveFailedAlert = $('#failedToSave');
    $("#newConnectionForm").submit(function (event) {
        event.preventDefault()
        event.stopPropagation()
        //If successful, display success alert else failure alert.
        $.post('connectorConnections.php', $('#newConnectionForm').serialize(), function (data) {
            if (data === 'saved') {
                saveAlert.show().fadeOut(3000);
                fetchConnections()
            }
        }).fail(function () {
            saveFailedAlert.show().fadeOut(3000);
        });
    })
}

function saveConnectionToLocalStorage()
{
    //TODO: implement save connection to localstorage method
}

function deleteConnectionFromLocalStorage()
{
    //TODO: implement delete connection from localstorage method
}

function fetchConnections()
{
    $.post('connectorConnections.php', {method: 'fetchConnections'}).done(function (data) {
        //Build connection dropdown from fetched connections
        const jsonData              = JSON.parse(data);
        const alreadyCreatedOptions = $('#connectorDropdown option').map(function () {
            return $(this).val()
        }).get();
        buildConnectorDropDownOptions(jsonData, alreadyCreatedOptions)
        //Display token of currently selected connector
        if (jsonData[0] !== undefined) {
            $('#connectorToken').val(jsonData[0].token);
        }
        $('#connectorDropdown').change(function () {
            const selected = $('#connectorDropdown :selected').val();
            $.each(jsonData, function (key, value) {
                if (selected === value.url) {
                    $('#connectorToken').val(value.token)
                }
            })
        })
    })
}

function buildConnectorDropDownOptions(jsonData, alreadyCreatedOptions)
{
    $.each(jsonData, function (key, value) {
        if ($.inArray(value.url, alreadyCreatedOptions) === -1) {
            $("#connectorDropdown").append(`<option value="${value.url}">${value.name} | ${value.url}</option>`)
        }
    })
}
function buildActionDropDownOptions()
{
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

function registerEvents()
{
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
}

function fillResultWindow(response)
{
    $('#results').val(response);
}