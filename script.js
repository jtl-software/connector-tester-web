$(document).ready(function () {
    fetchConnections()
    saveConnection()
    buildActionDropDownOptions()
});

function saveConnection()
{
    const saveAlert       = $('#savedSuccessfully');
    const saveFailedAlert = $('#failedToSave');
    saveAlert.hide();
    saveFailedAlert.hide();
    $("#newConnectionForm").submit(function (event) {
        //If successful, display success alert else failure alert.
        $.post('connectorConnections.php', $('#newConnectionForm').serialize(), function (data) {
            if (data === 'saved') {
                saveAlert.show().fadeOut(3000);
                fetchConnections()
            }
        }).fail(function () {
            saveFailedAlert.show().fadeOut(3000);
        });
        event.preventDefault();
    })
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
    $.each(controllers[selectedController], function (key, value) {
        $('#actionDropdown').append(`<option value="${value}">${value}</option>`);
    })

    $(controllerDropdown).change(function () {
        $('#actionDropdown').empty();
        selectedController = $(controllerDropdown).val();
        buildActionDropDownOptions();
    })
}