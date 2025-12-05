import { ClixDevice } from '../models/ClixDevice';
import type { ClixConfig } from './ClixConfig';

export class ClixEnvironment {
  config: ClixConfig;
  device: ClixDevice;

  constructor(config: ClixConfig, device: ClixDevice) {
    this.config = config;
    this.device = device;
  }

  setDevice(device: ClixDevice) {
    this.device = device;
  }

  getDevice(): ClixDevice {
    return this.device;
  }
}
