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

// Variables for connection attempts.
let reconnect_attempts = 0;
const max_reconnect_attempts = 300;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function onKoboldURLChanged() {
    extension_settings.koboldapi.url = $(this).val();
    saveSettingsDebounced();
}

/*
function onKoboldContextChanged() {
    extension_settings.koboldapi.context = $(this).val();
    saveSettingsDebounced();
}
*/

/*
function onKoboldCModelChanged() {
    extension_settings.koboldapi.model = $(this).val();
    saveSettingsDebounced();
}
*/

/*
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
*/

async function loadSettings()
{
    if ( ! extension_settings.koboldapi )
        extension_settings.koboldapi = { "url": "", "model": "", "unload": "" };
    if ( ! extension_settings.koboldapi.url )
        extension_settings.koboldapi.url = "";
    if ( ! extension_settings.koboldapi.model )
        extension_settings.koboldapi.model = "";
    if ( ! extension_settings.koboldapi.model )
        extension_settings.koboldapi.unload = "";

//    setAPIKeyPlaceholder();
    saveSettingsDebounced();
    await fetchKoboldModels();
}

/*
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
*/

async function fetchKoboldModels()
{
    const response = await fetch(`${extension_settings.koboldapi.url}/api/admin/list_options`)
        .then((response) => response.json())
        .then((list) => {
            kobold_models=list;
        }).catch(error => console.log("KoboldCCP Loader List Failed: " + error.message));
}

async function listKoboldModels()
{
    let kcppslist = [];
    const response = await fetch(`${extension_settings.koboldapi.url}/api/admin/list_options`)
        .then((response) => response.json())
        .then((list) => {
            kcppslist=list;
        }).catch(error => console.log("KoboldCCP Loader List Failed: " + error.message));

    return kcppslist;
}

async function curUnloadModel() {
    const kcpps_cfg = extension_settings.koboldapi.unload;
    return kcpps_cfg;
}

async function onModelLoad(args, value){
    extension_settings.koboldapi.model = $('#kobold_api_model_list').val();
    saveSettingsDebounced();

    const modelName = value    ?? $('#kobold_api_model_list').val();
    
    await fetch(`${extension_settings.koboldapi.url}/api/admin/reload_config`, {
        method: "POST",
        body: JSON.stringify({
          filename: modelName,
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

async function onModelUnload(){
    extension_settings.koboldapi.unload = $('#kobold_api_unload_list').val();
    saveSettingsDebounced();

    const modelName = $('#kobold_api_unload_list').val();
    
    await fetch(`${extension_settings.koboldapi.url}/api/admin/reload_config`, {
        method: "POST",
        body: JSON.stringify({
          filename: modelName,
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

function onStatusChange(e)
{
    if ( e != "no_connection")
        reconnect_attempts = 0;
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "kcpp-load",
    callback: onModelLoad,
    helpString: "Load/Reload a .kcpps config",
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: ".kcpps config to load",
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "kcpp-unload",
    callback: curUnloadModel,
    helpString: "Output the string of the current unloaded models kcpps config.",
    returns: "String of Unload kcpps file name."
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: "kcpp-list",
    callback: listKoboldModels,
    helpString: "Output a list of currently available kcpps config files.",
    returns: "List of kcpps config files",
}));

jQuery(async function() {
    const html = `
    <div class="koboldapi_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>KoboldCPP .kcpps Loader</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexFlowColumn">
                    <h4>KoboldCPP Loader Base URL</h4>
                    <input id="kobold_api_url" class="text_pole textarea_compact" type="text" />
            <!--    <h4>Loader API Key</h4>
                    <div class="flex-container">
                        <input id="kobold_api_apikey" name="kobold_api_apikey" class="text_pole flex1 wide100p" maxlength="500" size="35" type="text" autocomplete="off">
                        <div id="kobold_api_apikey_clear" title="Clear your admin key" data-i18n="[title]Clear your admin key" class="menu_button fa-solid fa-circle-xmark clear-api-key" data-key="admin_key_tabby_ext_ext">
                    </div>
            -->
                </div>
                <div class="flex-container">
                    <h4>Available .kcpps configurations</h4>
                    <div id="kobold_api_model_reload" title="Refresh model list" data-i18n="[title]Refresh model list" class="menu_button fa-lg fa-solid fa-repeat"></div>
                </div>
                <div class="flex-container flexFlowColumn">
                    <input id="kobold_api_model_list" name="model_list" class="text_pole flex1 wide100p" placeholder=".kcpps name here" maxlength="100" size="35" value="" autocomplete="off">
                    <h4>Unload models .kcpps config</h4>
                    <input id="kobold_api_unload_list" name="unload_list" class="text_pole flex1 wide100p" placeholder=".kcpps name here" maxlength="100" size="35" value="" autocomplete="off">
            <!--    <h4>Context Tokens (in 1024 chunks)</h4>
                    <input id="kobold_api_model_context" class="text_pole flex1 wide100p" placeholder="Context Tokens" maxlength="3" size="35" value="" autocomplete="off" type="number" min="0" step="1">
                    <h4>Other Options</h4>
                    <input id="kobold_api_model_opt" class="text_pole flex1 wide100p" placeholder="--kobold-flags" size="35" value="" autocomplete="off">
            -->
                </div>
                <div class="flex-container">
                    <input id="kobold_api_load_button" class="menu_button" type="submit" value="Reload KoboldCPP Config" />
                    <input id="kobold_api_unload_button" class="menu_button" type="button" value="Unload" />
                </div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(html);
    eventSource.on(event_types.ONLINE_STATUS_CHANGED, onStatusChange);
    
    await loadSettings();
        
    $('#kobold_api_url').val(extension_settings.koboldapi.url).on('input',onKoboldURLChanged);
    //$('#kobold_api_model_opt').val(extension_settings.koboldapi.opt).on('input',onKoboldOptChanged);
    //$('#kobold_api_model_context')
    //  .val(extension_settings.koboldapi.context)
    //  .on('input',onKoboldContextChanged)
    //  .on('keyup',onNumbersOnly);
    $('#kobold_api_model_reload').on('click', fetchKoboldModels);
    //$('#kobold_api_apikey').on('input', onAPIKey);
    //$('#kobold_api_apikey_clear').on('click', onClearAPIKey);
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

    $('#kobold_api_unload_list')
    .val(extension_settings.koboldapi.unload)
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
