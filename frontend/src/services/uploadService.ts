import { apiCall } from './api';

export class UploadService {
  /**
   * Upload an image base64 data URI to the server
   */
  static async uploadImage(base64Image: string, token: string | null) {
    return apiCall('/upload', {
      method: 'POST',
      body: { image: base64Image },
      token,
    });
  }
}

export default UploadService;
