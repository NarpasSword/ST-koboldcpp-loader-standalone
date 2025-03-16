import { 
    saveSettingsDebounced,
    eventSource,event_types
} from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from '../../../slash-commands/SlashCommandArgument.js';

// Variable for saved models.
let kobold_models = [];

// 
let reconnect_attempts = 0;
const max_reconnect_attempts = 300;

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

function onKoboldCModelChanged() {
    extension_settings.koboldapi.model = $(this).val();
    saveSettingsDebounced();
}

function onKoboldOptChanged() {
    extension_settings.koboldapi.opt = $(this).val();
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
        extension_settings.koboldapi = { "url": "", "context": 8, "model": "", "options": ""};
    if ( ! extension_settings.koboldapi.url )
        extension_settings.koboldapi.url = "";
    if ( ! extension_settings.koboldapi.context )
        extension_settings.koboldapi.context = 8;
    if ( ! extension_settings.koboldapi.model )
        extension_settings.koboldapi.model = "";
    if ( ! extension_settings.koboldapi.opt )
        extension_settings.koboldapi.opt = "";

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
    const url = $('input[data-server-history="koboldcpp"]').val();
    const response = await fetch(`${extension_settings.koboldapi.url}/api/admin/list_options`)
        .then((response) => response.json())
        .then((list) => {
            kobold_models=list;
        }).catch(error => console.log("KoboldCCP Switch API List Failed: " + error.message));
}

async function onModelLoad(args, value){
    extension_settings.koboldapi.model = $('#kobold_api_model_list').val();
    saveSettingsDebounced();

    const modelget = value    ?? $('#kobold_api_model_list').val();
    const ctxget   = args.ctx ?? $('#kobold_api_model_context').val();
    const cmdget   = args.cmd ?? $('#kobold_api_model_opt').val();
    
    await fetch(`${extension_settings.koboldapi.url}/load`, {
        method: "POST",
        body: JSON.stringify({
          model: modelget,
          context: ctxget,
          options: cmdget,
          apikey: localStorage.getItem('KoboldCPP_Loder_APIKey')
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8"
        }
    })
    .then( async () => {
        reconnect_attempts = max_reconnect_attempts;
        while (reconnect_attempts > 0)
        {
            reconnect_attempts--;
            console.log("Try to reconnect: " + reconnect_attempts);
            $('#api_button_textgenerationwebui').click();
            await sleep(1000);
            if (reconnect_attempts > 0)
                $('.api_loading').click();
        }
    })
    .catch(error => console.log("KoboldCCP Switch API Load Failed: " + error.message));
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
        $('.api_loading').click();
    })
    .catch(error => console.log("KoboldCCP Switch API Unload Failed: " + error.message));
}

function onStatusChange(e)
{
    if ( e != "no_connection")
        reconnect_attempts = 0;
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "kcpp-load",
    callback: onModelLoad,
    helpString: "Load a different KCpp model",
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: "Model to load",
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false,
        }),
    ],
    namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
            name: "ctx",
            description: "Model context size",
            typeList: [ARGUMENT_TYPE.NUMBER],
            isRequired: false,
        }),
        SlashCommandNamedArgument.fromProps({
            name: "cmd",
            description: "KCpp extra CLI flags",
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: false,
        }),
    ],
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "kcpp-unload",
    callback: onModelUnload,
    helpString: "Unload the current KCpp model",
}));

jQuery(async function() {
    const html = `
    <div class="koboldapi_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>KoboldCPP Loader - Standalone</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexFlowColumn">
                    <h4>KoboldCPP Loader API URL</h4>
                    <input id="kobold_api_url" class="text_pole textarea_compact" type="text" />
                    <h4>Loader API Key</h4>
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
                    <input id="kobold_api_model_context" class="text_pole flex1 wide100p" placeholder="Context Tokens" maxlength="3" size="35" value="" autocomplete="off" type="number" min="0" step="1">
                    <h4>Other Options</h4>
                    <input id="kobold_api_model_opt" class="text_pole flex1 wide100p" placeholder="--kobold-flags" size="35" value="" autocomplete="off">
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
    $('#kobold_api_model_opt').val(extension_settings.koboldapi.opt).on('input',onKoboldOptChanged);
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
    .val(extension_settings.koboldapi.model)
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
