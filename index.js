import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

function onKoboldURLChanged() {
    extension_settings.koboldapi.url = $(this).val();
    saveSettingsDebounced();
}

function onKoboldContextChanged() {
    console.log("Context Changed: " + $(this).val());
    extension_settings.koboldapi.context = $(this).val();
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
                    <div id="kobold_api_model_reload" title="Refresh model list" data-i18n="[title]Refresh model list" class="menu_button fa-lg fa-solid fa-repeat"></div>
                    <h4>Context Tokens (in 1024 chunks)</h4>
                </div>
                <div class="flex-container flexFlowColumn">
                    <input id="kobold_api_model_list" name="model_list" class="text_pole flex1 wide100p" placeholder="Model name here" maxlength="100" size="35" value="" autocomplete="off">
                    <h4>Context Tokens (in 1024 chunks)</h4>
                    <input id="kobold_api_model_context" name="model_list" class="text_pole flex1 wide100p" placeholder="Context Tokens" maxlength="3" size="35" value="" autocomplete="off" type="number" min="0" step="1">
                </div>
                <div class="flex-container">
                    <input id="kobold_api_load_button" class="menu_button" type="submit" value="Load" />
                    <input id="kobold_api_unload_button" class="menu_button" type="button" value="Unload" />
                </div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(html);
    
    if (! extension_settings.koboldapi ) 
    {
        extension_settings.koboldapi = { "url": "", "context": 8 };
        saveSettingsDebounced();
    } 
    if ( ! extension_settings.koboldapi.url )
    {
        extension_settings.koboldapi.url = "";
        saveSettingsDebounced();
    } 
    if ( ! extension_settings.koboldapi.context )
    {
        extension_settings.koboldapi.context = 8;
        saveSettingsDebounced();
    } 
        
    $('#kobold_api_url').val(extension_settings.koboldapi.url).on('input',onKoboldURLChanged);
    $('#kobold_api_model_context').val(extension_settings.koboldapi.context).on('input',onKoboldContextChanged);

});
