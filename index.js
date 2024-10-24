import { 
    saveSettingsDebounced,
    eventSource,event_types,
    cancelStatusCheck
} from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

// Variable for saved models.
let kobold_models = [];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function onKoboldURLChanged() {
    extension_settings.koboldapi.url = $(this).val();
    saveSettingsDebounced();
}

function onKoboldContextChanged() {
    extension_settings.koboldapi.context = $(this).val();
    saveSettingsDebounced();
}

function onNumbersOnly(event){
    var v = this.value;
    if($.isNumeric(v) === false) {
         this.value = extension_settings.koboldapi.context;
    }
}

async function loadSettings()
{
    if (! extension_settings.koboldapi )
        extension_settings.koboldapi = { "url": "", "context": 8 };
    if ( ! extension_settings.koboldapi.url )
        extension_settings.koboldapi.url = "";
    if ( ! extension_settings.koboldapi.context )
        extension_settings.koboldapi.context = 8;

    setAPIKeyPlaceholder();
    saveSettingsDebounced();
    await fetchKoboldModels();
}

function setAPIKeyPlaceholder()
{
    let api = localStorage.getItem('KoboldCPP_Loder_APIKey');
    const placeholder = api ? '✔️ Key found' : '❌ Missing key';
    $('#kobold_api_apikey').attr('placeholder', placeholder);
}

function onClearAPIKey()
{
    localStorage.removeItem('KoboldCPP_Loder_APIKey');
    setAPIKeyPlaceholder();
}

function onAPIKey()
{
    const value = $(this).val();
    if (value) {
        localStorage.setItem('KoboldCPP_Loder_APIKey', value);
    }
}

async function fetchKoboldModels()
{
    const response = await fetch(`${extension_settings.koboldapi.url}/list`)
        .then((response) => response.json())
        .then((list) => {
            kobold_models=list;
        }).catch(error => console.log("KoboldCCP Switch API List Failed: " + error.message));
}

async function onModelLoad(){
    await fetch(`${extension_settings.koboldapi.url}/load`, {
        method: "POST",
        body: JSON.stringify({
          model: $('#kobold_api_model_list').val(),
          context: $('#kobold_api_model_context').val(),
          apikey: localStorage.getItem('KoboldCPP_Loder_APIKey')
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    }).catch(error => console.log("KoboldCCP Switch API Load Failed: " + error.message));
}

async function onModelUnload() {
    await fetch(`${extension_settings.koboldapi.url}/unload`, {
        method: "POST",
        body: JSON.stringify({
          apikey: localStorage.getItem('KoboldCPP_Loder_APIKey')
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then( async () => {
        $('#api_button_textgenerationwebui').click();
        await sleep(1000);
        //$('.api_loading').click();
        cancelStatusCheck();
    })
    .catch(error => console.log("KoboldCCP Switch API Unload Failed: " + error.message));
}

function onStatusChange(e)
{
    console.log("I Got an event !!!!");
    console.log(e);
}

jQuery(async function() {
    const html = `
    <div class="koboldapi_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>KoboldCPP Switch API</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexFlowColumn">
                    <h4>KoboldCPP Switch API URL</h4>
                    <input id="kobold_api_url" class="text_pole textarea_compact" type="text" />
                    <h4>KoboldAPI API Key</h4>
                    <div class="flex-container">
                        <input id="kobold_api_apikey" name="kobold_api_apikey" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off">
                        <div id="kobold_api_apikey_clear" title="Clear your admin key" data-i18n="[title]Clear your admin key" class="menu_button fa-solid fa-circle-xmark clear-api-key" data-key="admin_key_tabby_ext_ext">
                    </div>
                </div>
                <div class="flex-container">
                    <h4>LLM Models</h4>
                    <div id="kobold_api_model_reload" title="Refresh model list" data-i18n="[title]Refresh model list" class="menu_button fa-lg fa-solid fa-repeat"></div>
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
    eventSource.on(event_types.ONLINE_STATUS_CHANGED, onStatusChange);
    
    await loadSettings();
        
    $('#kobold_api_url').val(extension_settings.koboldapi.url).on('input',onKoboldURLChanged);
    $('#kobold_api_model_context')
      .val(extension_settings.koboldapi.context)
      .on('input',onKoboldContextChanged)
      .on('keyup',onNumbersOnly);
    $('#kobold_api_model_reload').on('click', fetchKoboldModels);
    $('#kobold_api_apikey').on('input', onAPIKey);
    $('#kobold_api_apikey_clear').on('click', onClearAPIKey);
    $('#kobold_api_load_button').on('click', onModelLoad);
    $('#kobold_api_unload_button').on('click', onModelUnload);    

    $('#kobold_api_model_list')
    .autocomplete({
        source: (_, response) => {
            return response(kobold_models);
        },
        minLength: 0,
    })
    .focus(function () {
        $(this)
            .autocomplete(
                'search',
                $(this).val(),
            );
    });
});
