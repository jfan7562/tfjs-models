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
import {TrackerConfig} from '../calculators/interfaces/config_interfaces';
import {EstimationConfig, ModelConfig} from '../types';

/**
 * The trackers that MoveNet supports.
 */
export enum MoveNetTrackerType {
  Keypoint = 'keypoint',
  BoundingBox = 'boundingBox'
}

/**
 * MoveNet model loading config.
 *
 * `enableSmoothing`: Optional. A boolean indicating whether to use temporal
 * filter to smooth the predicted keypoints. Defaults to True. To use smoothing
 * with multi-pose detection, tracking needs to be enabled. The temporal filter
 * relies on the currentTime field of the HTMLVideoElement. You can override
 * this timestamp by passing in your own timestamp (in milliseconds) as the
 * third parameter in `estimatePoses`. This is useful when the input is a
 * tensor, which doesn't have the currentTime field. Or in testing, to simulate
 * different FPS.
 *
 * `modelType`: Optional. The type of MoveNet model to load, Lighting or
 * Thunder. Defaults to Lightning. Lightning is a lower capacity model that can
 * run >50FPS on most modern laptops while achieving good performance. Thunder
 * is a higher capacity model that performs better prediction quality while
 * still achieving real-time (>30FPS) speed. Thunder will lag behind the
 * lightning, but it will pack a punch.
 *
 * `modelUrl`: Optional. An optional string that specifies custom url of the
 * model. This is useful for area/countries that don't have access to the model
 * hosted on TF Hub. If not provided, it will load the model specified by
 * `modelType` from tf.hub.
 *
 * `minPoseScore`: Optional. The minimum confidence score a pose needs to have
 * to be considered a valid pose detection.
 *
 * `multiPoseMaxDimension`: Optional. The target maximum dimension to use as the
 * input to the multi-pose model. Must be a multiple of 32 and defaults to 320.
 * The input image will be resized so that its maximum dimension will be the
 * given number, while maintaining the input image aspect ratio. As an example:
 * with 320 as the maximum dimension and a 640x480 input image, the model will
 * resize the input to 320x240. A 720x1280 image will be resized to 180x320.
 *
 * `enableTracking': Optional. A boolean indicating whether detected persons
 * will be tracked across frames. If true, each pose will have an ID that
 * uniquely identifies a person. Only used with multi-pose models.
 *
 * `trackerType`: Optional. A `MoveNetTrackerType` indicating which type of
 * tracker to use. Defaults to keypoint tracking.
 *
 * `trackerConfig`: Optional. A `TrackerConfig` object that specifies the
 * configuration to use for the tracker. For properties that are not specified,
 * default values will be used.
 */
export interface MoveNetModelConfig extends ModelConfig {
  enableSmoothing?: boolean;
  modelType?: string;
  modelUrl?: string;
  minPoseScore?: number;
  multiPoseMaxDimension?: number;
  enableTracking?: boolean;
  trackerType?: MoveNetTrackerType;
  trackerConfig?: TrackerConfig;
}

/**
 * MoveNet Specific Inference Config.
 */
export interface MoveNetEstimationConfig extends EstimationConfig {}
