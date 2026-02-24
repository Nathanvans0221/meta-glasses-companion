import type { RegisteredTool } from '../types';
import { glassesService } from '../../glasses';

/**
 * Capture a high-resolution photo from the glasses camera.
 * The photo is sent directly to Gemini as an image frame for visual analysis.
 * Requires an active camera stream (started when hands-free + glasses connected).
 */
export const capturePhotoTool: RegisteredTool = {
  declaration: {
    name: 'capture_photo',
    description:
      'Take a high-resolution photo from the Meta glasses camera. ' +
      'Use this when you need a clearer image than the continuous video stream provides — ' +
      'for example, reading small text, identifying plant diseases up close, or scanning labels/barcodes. ' +
      'The photo result will be sent as an image frame for your analysis.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Brief reason for taking the photo (for logging)',
        },
      },
      required: [],
    },
  },
  handler: async (args) => {
    const reason = (args.reason as string) || 'on-demand capture';

    if (!glassesService.isConfigured()) {
      return {
        success: false,
        error: 'Glasses not connected. Camera requires Meta glasses with DAT SDK registration.',
      };
    }

    // Trigger photo capture — result is delivered asynchronously via onPhotoCapture event,
    // which HomeScreen forwards to Gemini as an image frame
    const triggered = await glassesService.capturePhoto('jpeg');

    if (!triggered) {
      return {
        success: false,
        error: 'Camera stream not active. Make sure glasses are connected and camera is streaming.',
      };
    }

    return {
      success: true,
      message: `Photo capture triggered (${reason}). The high-resolution image will appear in your visual feed shortly.`,
    };
  },
};
