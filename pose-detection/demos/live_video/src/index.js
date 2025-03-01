/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/pose";

import * as tfjsWasm from "@tensorflow/tfjs-backend-wasm";

tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${tfjsWasm.version_wasm}/dist/`
);

import * as posedetection from "@tensorflow-models/pose-detection";

import { Camera } from "./camera";
import { setupDatGui } from "./option_panel";
import { STATE } from "./params";
import { setupStats } from "./stats_panel";
import { setBackendAndEnvFlags } from "./util";

let detector, camera, stats;
let startInferenceTime,
    numInferences = 0;
let inferenceTimeSum = 0,
    lastPanelUpdate = 0;
let rafId;

async function createDetector() {
    switch (STATE.model) {
        case posedetection.SupportedModels.PoseNet:
            return posedetection.createDetector(STATE.model, {
                quantBytes: 4,
                architecture: "MobileNetV1",
                outputStride: 16,
                inputResolution: { width: 500, height: 500 },
                multiplier: 0.75,
            });
        case posedetection.SupportedModels.BlazePose:
            const runtime = STATE.backend.split("-")[0];
            if (runtime === "mediapipe") {
                return posedetection.createDetector(STATE.model, {
                    runtime,
                    modelType: STATE.modelConfig.type,
                    solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.4",
                });
            } else if (runtime === "tfjs") {
                return posedetection.createDetector(STATE.model, {
                    runtime,
                    modelType: STATE.modelConfig.type,
                });
            }
        case posedetection.SupportedModels.MoveNet:
            let modelType;
            if (STATE.modelConfig.type == "lightning") {
                modelType = posedetection.movenet.modelType.SINGLEPOSE_LIGHTNING;
            } else if (STATE.modelConfig.type == "thunder") {
                modelType = posedetection.movenet.modelType.SINGLEPOSE_THUNDER;
            } else if (STATE.modelConfig.type == "multipose") {
                modelType = posedetection.movenet.modelType.MULTIPOSE;
            }
            if (STATE.modelConfig.customModel !== "") {
                return posedetection.createDetector(STATE.model, {
                    modelType,
                    modelUrl: STATE.modelConfig.customModel,
                });
            }
            return posedetection.createDetector(STATE.model, { modelType });
    }
}

async function checkGuiUpdate() {
    if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {
        camera = await Camera.setupCamera(STATE.camera);
        STATE.isTargetFPSChanged = false;
        STATE.isSizeOptionChanged = false;
    }

    if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
        STATE.isModelChanged = true;

        window.cancelAnimationFrame(rafId);

        if (detector != null) {
            detector.dispose();
        }

        if (STATE.isFlagChanged || STATE.isBackendChanged) {
            await setBackendAndEnvFlags(STATE.flags, STATE.backend);
        }

        try {
            detector = await createDetector(STATE.model);
        } catch (error) {
            detector = null;
            alert(error);
        }

        STATE.isFlagChanged = false;
        STATE.isBackendChanged = false;
        STATE.isModelChanged = false;
    }
}

function beginEstimatePosesStats() {
    startInferenceTime = (performance || Date).now();
}

function endEstimatePosesStats() {
    const endInferenceTime = (performance || Date).now();
    inferenceTimeSum += endInferenceTime - startInferenceTime;
    ++numInferences;

    const panelUpdateMilliseconds = 1000;
    if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
        const averageInferenceTime = inferenceTimeSum / numInferences;
        inferenceTimeSum = 0;
        numInferences = 0;
        stats.customFpsPanel.update(
            1000.0 / averageInferenceTime,
            120 /* maxValue */
        );
        lastPanelUpdate = endInferenceTime;
    }
}

async function renderResult() {
    if (camera.video.readyState < 2) {
        await new Promise((resolve) => {
            camera.video.onloadeddata = () => {
                resolve(video);
            };
        });
    }

    let poses = null;

    // Detector can be null if initialization failed (for example when loading
    // from a URL that does not exist).
    if (detector != null) {
        // FPS only counts the time it takes to finish estimatePoses.
        //beginEstimatePosesStats();

        // Detectors can throw errors, for example when using custom URLs that
        // contain a model that doesn't provide the expected output.
        try {
            poses = await detector.estimatePoses(camera.video, {
                maxPoses: STATE.modelConfig.maxPoses,
                flipHorizontal: false,
            });
        } catch (error) {
            detector.dispose();
            detector = null;
            alert(error);
        }

        //endEstimatePosesStats();
    }

    if (window.cam == undefined) {
        window.cam = camera;
    }
    camera.drawCtx();

    // The null check makes sure the UI is not in the middle of changing to a
    // different model. If during model change, the result is from an old model,
    // which shouldn't be rendered.
    if (poses && poses.length > 0 && !STATE.isModelChanged) {
        camera.drawResults(poses);
        camera.drawIdeal();
    }

    camera.drawIndicators();
}

async function renderPrediction() {
    await checkGuiUpdate();

    if (!STATE.isModelChanged) {
        await renderResult();
    }

    rafId = requestAnimationFrame(renderPrediction);
}

async function app() {
    // Gui content will change depending on which model is in the query string.
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("model")) {
        alert("Cannot find model in the query string.");
        return;
    }

    await setupDatGui(urlParams);

    //stats = setupStats();

    camera = await Camera.setupCamera(STATE.camera);

    await setBackendAndEnvFlags(STATE.flags, STATE.backend);

    detector = await createDetector();

    renderPrediction();
}

app();