// ST-koboldcpp-loader-standalone — improved full file
// - Robust fetch with response.ok checks
// - Live-refreshes autocomplete sources after reload
// - Debug UI (status line, verbose log, test/ping button)
// - Fixed settings guard (unload default)
// - Consistent "KoboldCPP" logging
// - Added /kcpp-ping slash command

import {
    saveSettingsDebounced,
    eventSource, event_types
} from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';
import { ARGUMENT_TYPE, SlashCommandArgument } from '../../../slash-commands/SlashCommandArgument.js';

// Variable for saved models.
let kobold_models = [];

// Variables for connection attempts.
let reconnect_attempts = 0;
const max_reconnect_attempts = 300;

// Debug flag
let debugEnabled = false;

// ---------- utils ----------
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function setStatus(msg) {
    $('#kobold_api_status').text(msg || '');
}

function dbg(...args) {
    if (!debugEnabled) return;
    console.log('[KoboldCPP Loader]', ...args);
    const line = args.map(a => {
        try {
            return (typeof a === 'string') ? a : JSON.stringify(a);
        } catch {
            return String(a);
        }
    }).join(' ');
    const el = $('#kobold_api_debug');
    el.text((el.text() + line + '\n').slice(-8000)); // keep last ~8KB
}

// ---------- settings handlers ----------
function onKoboldURLChanged() {
    extension_settings.koboldapi.url = $(this).val();
    saveSettingsDebounced();
}

// ---------- settings bootstrap ----------
async function loadSettings() {
    if (!extension_settings.koboldapi)
        extension_settings.koboldapi = { url: '', model: '', unload: '' };

    if (!extension_settings.koboldapi.url)
        extension_settings.koboldapi.url = '';

    if (!extension_settings.koboldapi.model)
        extension_settings.koboldapi.model = '';

    if (!extension_settings.koboldapi.unload)
        extension_settings.koboldapi.unload = '';

    saveSettingsDebounced();
    await fetchKoboldModels({ silent: true });
}

// ---------- network ----------
async function fetchKoboldModels({ silent = false } = {}) {
    try {
        const base = (extension_settings.koboldapi?.url || '').trim();
        if (!base) throw new Error('Missing KoboldCPP Loader Base URL');

        const res = await fetch(`${base}/api/admin/list_options`, { method: 'GET' });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        const list = await res.json();
        if (!Array.isArray(list)) throw new Error('Unexpected response shape from list_options');

        kobold_models = list;

        // Refresh jQuery UI autocomplete sources so the UI visibly updates
        $('#kobold_api_model_list')
            .autocomplete('option', 'source', (_, response) => response(kobold_models))
            .autocomplete('search', $('#kobold_api_model_list').val());

        $('#kobold_api_unload_list')
            .autocomplete('option', 'source', (_, response) => response(kobold_models))
            .autocomplete('search', $('#kobold_api_unload_list').val());

        dbg('list_options OK:', kobold_models);
        if (!silent) setStatus(`OK: ${kobold_models.length} .kcpps`);
        return true;
    } catch (err) {
        console.error('KoboldCPP Loader List Failed:', err);
        setStatus(`List FAILED: ${err.message}`);
        dbg('list_options ERROR:', err);
        return false;
    }
}

async function listKoboldModels() {
    // If we don't have a list yet, try to fetch quietly
    if (!kobold_models || kobold_models.length === 0) {
        await fetchKoboldModels({ silent: true });
    }
    return kobold_models;
}

async function curUnloadModel() {
    return extension_settings.koboldapi.unload;
}

// ---------- actions ----------
async function onModelLoad(args, value) {
    try {
        const modelName = (value ?? $('#kobold_api_model_list').val() ?? '').trim();
        extension_settings.koboldapi.model = modelName;
        saveSettingsDebounced();

        if (!modelName) throw new Error('No .kcpps filename selected');
        const base = (extension_settings.koboldapi?.url || '').trim();
        if (!base) throw new Error('Missing KoboldCPP Loader Base URL');

        const res = await fetch(`${base}/api/admin/reload_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ filename: modelName }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        setStatus(`Reload sent: ${modelName}`);
        dbg('reload_config OK:', modelName);

        // Reconnect loop: preserve your logic; will stop if status changes (see onStatusChange)
        reconnect_attempts = max_reconnect_attempts;
        while (reconnect_attempts > 0) {
            reconnect_attempts--;
            $('#api_button_textgenerationwebui').click();
            await sleep(1000);
            if (reconnect_attempts > 0) $('.api_loading').click();
        }
    } catch (err) {
        console.error('KoboldCPP Switch API Load Failed:', err);
        setStatus(`Reload FAILED: ${err.message}`);
        dbg('reload_config ERROR:', err);
    }
}

async function onModelUnload() {
    try {
        const modelName = ($('#kobold_api_unload_list').val() ?? '').trim();
        extension_settings.koboldapi.unload = modelName;
        saveSettingsDebounced();

        if (!modelName) throw new Error('No .kcpps filename to unload');
        const base = (extension_settings.koboldapi?.url || '').trim();
        if (!base) throw new Error('Missing KoboldCPP Loader Base URL');

        const res = await fetch(`${base}/api/admin/reload_config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify({ filename: modelName }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

        setStatus(`Unload sent: ${modelName}`);
        dbg('reload_config (unload) OK:', modelName);

        reconnect_attempts = max_reconnect_attempts;
        while (reconnect_attempts > 0) {
            reconnect_attempts--;
            $('#api_button_textgenerationwebui').click();
            await sleep(1000);
            if (reconnect_attempts > 0) $('.api_loading').click();
        }
    } catch (err) {
        console.error('KoboldCPP Switch API Load Failed:', err);
        setStatus(`Unload FAILED: ${err.message}`);
        dbg('reload_config (unload) ERROR:', err);
    }
}

// Stop reconnect churn as soon as we detect we're online
function onStatusChange(e) {
    if (e !== 'no_connection') {
        reconnect_attempts = 0;
        setStatus('Online');
    }
}

// ---------- slash commands ----------
SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'kcpp-load',
    callback: onModelLoad,
    helpString: 'Load/Reload a .kcpps config',
    unnamedArgumentList: [
        SlashCommandArgument.fromProps({
            description: '.kcpps config to load',
            typeList: [ARGUMENT_TYPE.STRING],
            isRequired: true,
        }),
    ],
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'kcpp-unload',
    callback: curUnloadModel,
    helpString: 'Output the string of the current unloaded models kcpps config.',
    returns: 'String of Unload kcpps file name.',
}));

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'kcpp-list',
    callback: listKoboldModels,
    helpString: 'Output a list of currently available kcpps config files.',
    returns: 'List of kcpps config files',
}));

async function pingKobold() {
    const ok = await fetchKoboldModels({ silent: true });
    return ok ? { ok: true, count: kobold_models.length } : { ok: false };
}

SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'kcpp-ping',
    callback: pingKobold,
    helpString: 'Check admin API reachability and count available .kcpps.',
    returns: 'Object: { ok: boolean, count?: number }',
}));

// ---------- UI ----------
jQuery(async function () {
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
                </div>

                <div class="flex-container">
                    <h4>Available .kcpps configurations</h4>
                    <div id="kobold_api_model_reload" title="Refresh model list" data-i18n="[title]Refresh model list" class="menu_button fa-lg fa-solid fa-repeat"></div>
                </div>

                <div class="flex-container flexFlowColumn">
                    <input id="kobold_api_model_list" name="model_list" class="text_pole flex1 wide100p" placeholder=".kcpps name here" maxlength="100" size="35" value="" autocomplete="off">
                    <h4>Unload models .kcpps config</h4>
                    <input id="kobold_api_unload_list" name="unload_list" class="text_pole flex1 wide100p" placeholder=".kcpps name here" maxlength="100" size="35" value="" autocomplete="off">
                </div>

                <div class="flex-container" style="align-items:center;gap:8px;">
                    <input id="kobold_api_test_button" class="menu_button" type="button" value="Test Admin API" />
                    <span id="kobold_api_status" class="monospace" style="margin-left:4px;"></span>
                </div>

                <div class="flex-container flexFlowColumn" style="gap:6px;">
                    <label style="display:flex;align-items:center;gap:6px;">
                        <input id="kobold_api_debug_toggle" type="checkbox" />
                        Verbose debug log
                    </label>
                    <pre id="kobold_api_debug" class="text_pole textarea_compact" style="height:140px;overflow:auto;"></pre>
                </div>

                <div class="flex-container">
                    <input id="kobold_api_load_button" class="menu_button" type="submit" value="Reload KoboldCPP Config" />
                    <input id="kobold_api_unload_button" class="menu_button" type="button" value="Test/Save Unload Config" />
                </div>
            </div>
        </div>
    </div>`;

    $('#extensions_settings').append(html);
    eventSource.on(event_types.ONLINE_STATUS_CHANGED, onStatusChange);

    await loadSettings();

    // inputs + handlers
    $('#kobold_api_url').val(extension_settings.koboldapi.url).on('input', onKoboldURLChanged);

    $('#kobold_api_model_reload').on('click', async () => {
        await fetchKoboldModels();
    });

    $('#kobold_api_load_button').on('click', onModelLoad);
    $('#kobold_api_unload_button').on('click', onModelUnload);

    $('#kobold_api_test_button').on('click', async () => {
        setStatus('Pinging /api/admin/list_options ...');
        const ok = await fetchKoboldModels({ silent: true });
        setStatus(ok ? `OK: ${kobold_models.length} .kcpps` : 'Ping failed (see log)');
    });

    $('#kobold_api_debug_toggle').on('change', function () {
        debugEnabled = this.checked;
        setStatus(debugEnabled ? 'Debug: ON' : 'Debug: OFF');
    });

    // Autocomplete wiring
    $('#kobold_api_model_list')
        .val(extension_settings.koboldapi.model)
        .autocomplete({
            source: (_, response) => response(kobold_models),
            minLength: 0,
        })
        .focus(function () {
            $(this).autocomplete('search', $(this).val());
        });

    $('#kobold_api_unload_list')
        .val(extension_settings.koboldapi.unload)
        .autocomplete({
            source: (_, response) => response(kobold_models),
            minLength: 0,
        })
        .focus(function () {
            $(this).autocomplete('search', $(this).val());
        });
});
