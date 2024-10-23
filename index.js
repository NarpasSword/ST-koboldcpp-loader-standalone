import { saveSettingsDebounced } from '../../../../script.js';
import { extension_settings } from '../../../extensions.js';

function toggleRandomizedSetting(buttonRef, forId) {
    if (extension_settings.randomizer.controls.indexOf(forId) === -1) {
        extension_settings.randomizer.controls.push(forId);
    } else {
        extension_settings.randomizer.controls = extension_settings.randomizer.controls.filter(x => x !== forId);
    }

    buttonRef.toggleClass('active');
    console.debug('Randomizer controls:', extension_settings.randomizer.controls);
    saveSettingsDebounced();
}

function addRandomizeButton() {
    const counterRef = $(this);
    const labelRef = $(this).find('input[data-for]');
    const isDisabled = counterRef.data('randomization-disabled');

    if (labelRef.length === 0 || isDisabled == true) {
        return;
    }

    const forId = labelRef.data('for');
    const buttonRef = $('<div class="randomize_button menu_button fa-solid fa-shuffle"></div>');
    buttonRef.toggleClass('active', extension_settings.randomizer.controls.indexOf(forId) !== -1);
    buttonRef.hide();
    buttonRef.on('click', () => toggleRandomizedSetting(buttonRef, forId));
    counterRef.append(buttonRef);
}

function onRandomizerEnabled() {
    extension_settings.randomizer.enabled = $(this).prop('checked');
    $('.randomize_button').toggle(extension_settings.randomizer.enabled);
    console.debug('Randomizer enabled:', extension_settings.randomizer.enabled);
}

window['randomizerInterceptor'] = (function () {
    if (extension_settings.randomizer.enabled === false) {
        console.debug('Randomizer skipped: disabled.');
        return;
    }

    if (extension_settings.randomizer.fluctuation === 0 || extension_settings.randomizer.controls.length === 0) {
        console.debug('Randomizer skipped: nothing to do.');
        return;
    }

    for (const control of extension_settings.randomizer.controls) {
        const controlRef = $('#' + control);

        if (controlRef.length === 0) {
            console.debug(`Randomizer skipped: control ${control} not found.`);
            continue;
        }

        if (!controlRef.is(':visible')) {
            console.debug(`Randomizer skipped: control ${control} is not visible.`);
            continue;
        }

        let previousValue = parseFloat(controlRef.data('previous-value'));
        let originalValue = parseFloat(controlRef.data('original-value'));
        let currentValue = parseFloat(controlRef.val());

        let value;

        // Initialize originalValue and previousValue if they are NaN
        if (isNaN(originalValue)) {
            originalValue = currentValue;
            controlRef.data('original-value', originalValue);
        }
        if (isNaN(previousValue)) {
            previousValue = currentValue;
            controlRef.data('previous-value', previousValue);
        }

        // If the current value hasn't changed compared to the previous value, use the original value as a base for the calculation
        if (currentValue === previousValue) {
            console.debug(`Randomizer for ${control} reusing original value: ${originalValue}`);
            value = originalValue;
        } else {
            console.debug(`Randomizer for ${control} using current value: ${currentValue}`);
            value = currentValue;
            controlRef.data('previous-value', currentValue); // Update the previous value when using the current value
            controlRef.data('original-value', currentValue); // Update the original value when using the current value
        }

        if (isNaN(value)) {
            console.debug('Randomizer skipped: NaN.');
            continue;
        }

        const fluctuation = extension_settings.randomizer.fluctuation;
        const min = parseFloat(controlRef.attr('min'));
        const max = parseFloat(controlRef.attr('max'));
        const delta = (Math.random() * fluctuation * 2 - fluctuation) * value;
        const newValue = Math.min(Math.max(value + delta, min), max);
        console.debug(`Randomizer for ${control}: ${value} -> ${newValue} (delta: ${delta}, min: ${min}, max: ${max})`);
        controlRef.val(newValue).trigger('input');
        controlRef.data('previous-value', parseFloat(controlRef.val()));
    }
});

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
                    <input id="draft_model_list" name="draft_model_list" class="text_pole flex1 wide100p" placeholder="Draft model name here" maxlength="100" size="35" value="" autocomplete="off">
                </div>
                <div class="flex-container">
                    <input id="load_model_button" class="menu_button" type="submit" value="Load" />
                    <input id="unload_model_button" class="menu_button" type="button" value="Unload" />
                </div>
            </div>
        </div>
    </div>    
    <div class="randomizer_settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Parameter Randomizer</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div>
                    After enabling this extension, click the new buttons next to the parameters you want to be randomized.
                    Randomization is active when the button has a solid background with an outline.
                </div>
                <br>
                <label for="randomizer_enabled" class="checkbox_label">
                    <input type="checkbox" id="randomizer_enabled" name="randomizer_enabled" >
                    Enabled
                </label>
                <div  class="range-block">
                    <div class="range-block-title">
                        Fluctuation (0-1)
                    </div>
                    <div class="range-block-range-and-counter">
                        <div class="range-block-range-and-counter">
                            <div class="range-block-range">
                                <input type="range" id="randomizer_fluctuation" min="0" max="1" step="0.1">
                            </div>
                            <div class="range-block-counter">
                                <div contenteditable="true" data-for="randomizer_fluctuation" id="randomizer_fluctuation_counter">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const getContainer = () => $(document.getElementById('randomizer_container') ?? document.getElementById('extensions_settings2'));
    getContainer().append(html);
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
});
