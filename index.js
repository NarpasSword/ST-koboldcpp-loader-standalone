import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

function onRandomizerEnabled() {
    extension_settings.randomizer.enabled = $(this).prop('checked');
    $('.randomize_button').toggle(extension_settings.randomizer.enabled);
    console.debug('Randomizer enabled:', extension_settings.randomizer.enabled);
}

function onKoboldURLChanged() {
    extension_settings.koboldapi.url = $(this).val();
    saveSettingsDebounced();
}

jQuery(() => {
    const html = `
    <div class="koboldapi_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>KoboldAPI Loader</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div>
                    Some text description and such !
                </div>
                <br>
                <div class="flex-container flexFlowColumn">
                    <label>KoboldAPI URL</label>
                    <input id="kobold_api_url" class="text_pole textarea_compact" type="text" />
                </div>
                <div class="flex-container">
                    <h4>Model Select</h4>
                    <div id="reload_model_list_button" title="Refresh model list" data-i18n="[title]Refresh model list" class="menu_button fa-lg fa-solid fa-repeat"></div>
                </div>
                <div class="flex-container flexFlowColumn">
                    <input id="model_list" name="model_list" class="text_pole flex1 wide100p" placeholder="Model name here" maxlength="100" size="35" value="" autocomplete="off">
                </div>
                <div class="flex-container">
                    <input id="load_model_button" class="menu_button" type="submit" value="Load" />
                    <input id="unload_model_button" class="menu_button" type="button" value="Unload" />
                </div>
            </div>
        </div>
    </div>`;

    $('extensions_settings').append($(html));
    
    /*
    if (Object.keys(extension_settings["koboldapi"]).length === 0) 
    {
        extension_settings.koboldapi = { "url": "" };
        saveSettingsDebounced();
    }
    $('#kobold_api_url').val(extension_settings.koboldapi.url).on('input',onKoboldURLChanged);
    */
    /*
    $('#ai_response_configuration .range-block-counter').each(addRandomizeButton);
    $('#randomizer_enabled').on('input', onRandomizerEnabled);
    $('#randomizer_enabled').prop('checked', extension_settings.randomizer.enabled).trigger('input');
    $('#randomizer_fluctuation').val(extension_settings.randomizer.fluctuation).trigger('input');
    $('#randomizer_fluctuation_counter').text(extension_settings.randomizer.fluctuation);
    $('#randomizer_fluctuation').on('input', function () {
        const value = parseFloat($(this).val());
        $('#randomizer_fluctuation_counter').text(value);
        extension_settings.randomizer.fluctuation = value;
        console.debug('Randomizer fluctuation:', extension_settings.randomizer.fluctuation);
        saveSettingsDebounced();
    });
    */
});
