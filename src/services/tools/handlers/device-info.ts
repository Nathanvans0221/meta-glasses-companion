import { Platform } from 'react-native';
import { APP_VERSION } from '../../../constants';
import type { RegisteredTool } from '../types';

export const deviceInfoTool: RegisteredTool = {
  declaration: {
    name: 'get_device_info',
    description:
      'Returns information about the device running the app, including platform, OS version, and app version. ' +
      'Use this when the user asks "what phone am I using?", "what device is this?", or similar.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  handler: async () => {
    return {
      platform: Platform.OS,
      osVersion: Platform.Version,
      appVersion: APP_VERSION,
      appName: 'WorkSuite Voice',
    };
  },
};
