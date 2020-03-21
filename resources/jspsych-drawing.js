/**
 * modified from Repository https://github.com/kurokida/jspsych-psychophysics
 * */

/**
 * jspsych-psychophysics
 * Copyright (c) 2013 Daiichiro Kuroki
 * Released under the MIT license
 * 
 * jspsych-psychophysics is a plugin for conducting Web-based psychophysical experiments using jsPsych (de Leeuw, 2015). 
 *
 * http://jspsychophysics.hes.kyushu-u.ac.jp/
 *
 **/

jsPsych.plugins["drawing"] = (function () {

    var plugin = {};

    plugin.info = {
        name: 'drawing',
        description: '',
        parameters: {
            drawFunc: {
                type: jsPsych.plugins.parameterType.FUNCTION,
                pretty_name: 'Draw function',
                default: null,
                description: 'This function enables to move objects horizontally and vertically.'
            },
            choices: {
                type: jsPsych.plugins.parameterType.KEYCODE,
                array: true,
                pretty_name: 'Choices',
                default: jsPsych.ALL_KEYS,
                description: 'The keys the subject is allowed to press to respond to the stimulus.'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Any content here will be displayed below the stimulus.'
            },
            canvas_width: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Canvas width',
                default: window.innerWidth - 10,
                description: 'The width of the canvas.'
            },
            canvas_height: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Canvas height',
                default: window.innerHeight - 10,
                description: 'The height of the canvas.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'How long to show trial before it ends.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, trial will end when subject makes a response.'
            },
            background_color: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Background color',
                default: 'white',
                description: 'The background color of the canvas.'
            },
            response_type: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'key or mouse',
                default: 'key',
                description: 'How to make a response.'
            },
            response_start_time: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Response start',
                default: 0,
                description: 'When the subject is allowed to respond to the stimulus.'
            },
        }
    }

    let default_maxWidth;
    plugin.trial = function (display_element, trial) {
        const elm_jspsych_content = document.getElementById('jspsych-content');
        const style_jspsych_content = window.getComputedStyle(elm_jspsych_content); // stock
        default_maxWidth = style_jspsych_content.maxWidth;
        elm_jspsych_content.style.maxWidth = 'none'; // The default value is '95%'. To fit the window.

        let new_html = '<canvas id="myCanvas" class="jspsych-canvas" width=' + trial.canvas_width + ' height=' + trial.canvas_height + ' style="background-color:' + trial.background_color + ';"></canvas>';

        const motion_rt_method = 'performance'; // 'date' or 'performance'. 'performance' is better.
        let start_time;

        // allow to respond using keyboard or mouse
        jsPsych.pluginAPI.setTimeout(function () {
            if (trial.response_type === 'key') {
                if (trial.choices != jsPsych.NO_KEYS) {
                    var keyboardListener = jsPsych.pluginAPI.getKeyboardResponse({
                        callback_function: after_response,
                        valid_responses: trial.choices,
                        rt_method: motion_rt_method,
                        persist: false,
                        allow_held_key: false
                    });
                }
            } else {
                if (motion_rt_method == 'date') {
                    start_time = (new Date()).getTime();
                } else {
                    start_time = performance.now();
                }
                window.addEventListener("mousedown", mouseDownFunc);
                canvas.addEventListener("mousedown", mouseDownFunc);
            }
        }, trial.response_start_time);

        // add prompt
        if (trial.prompt !== null) {
            new_html += trial.prompt;
        }

        // draw
        display_element.innerHTML = new_html;

        const canvas = document.getElementById('myCanvas');
        if (!canvas || !canvas.getContext) {
            alert('This browser does not support the canvas element.');
            return;
        }
        const ctx = canvas.getContext('2d');

        if (typeof trial.drawFunc === 'undefined') {
            alert('You have to specify the drawFunc parameter in the drawing plugin.');
        }

        function mouseDownFunc(e) {
            let click_time;

            if (motion_rt_method == 'date') {
                click_time = (new Date()).getTime();
            } else {
                click_time = performance.now();
            }

            e.preventDefault();

            after_response({
                key: -1,
                rt: click_time - start_time,
                // clickX: e.clientX,
                // clickY: e.clientY,
                clickX: e.offsetX,
                clickY: e.offsetY,
            });
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        trial.drawFunc(canvas, ctx);

        // store response
        var response = {
            rt: null,
            key: null
        };

        // function to end trial when it is time
        var end_trial = function () {
            document.getElementById('jspsych-content').style.maxWidth = default_maxWidth; // restore
            window.removeEventListener("mousedown", mouseDownFunc);
            canvas.removeEventListener("mousedown", mouseDownFunc);

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // kill keyboard listeners
            if (typeof keyboardListener !== 'undefined') {
                jsPsych.pluginAPI.cancelKeyboardResponse(keyboardListener);
            }

            // gather the data to store for the trial
            if (typeof response.clickX !== 'undefined') {
                var trial_data = {
                    "rt": response.rt,
                    "response_type": trial.response_type,
                    "key_press": response.key,
                    "click_x": response.clickX,
                    "click_y": response.clickY
                    // "click_x": response.clickX - centerX,
                    // "click_y": response.clickY- centerY
                };
            } else {
                var trial_data = {
                    "rt": response.rt,
                    "response_type": trial.response_type,
                    "key_press": response.key,
                };

            }

            // clear the display
            display_element.innerHTML = '';

            // move on to the next trial
            jsPsych.finishTrial(trial_data);
        };

        // function to handle responses by the subject
        var after_response = function (info) {
            // after a valid response, the stimulus will have the CSS class 'responded'
            // which can be used to provide visual feedback that a response was recorded
            //display_element.querySelector('#jspsych-html-keyboard-response-stimulus').className += ' responded';

            // only record the first response
            if (response.key == null) {
                response = info;
            }

            if (trial.response_ends_trial) {
                end_trial();
            }
        };

        // end trial if trial_duration is set
        if (trial.trial_duration !== null) {
            jsPsych.pluginAPI.setTimeout(function () {
                end_trial();
            }, trial.trial_duration);
        }

    };

    return plugin;
})();
