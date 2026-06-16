import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import fs from 'fs';
import path from 'path';

// POST /api/upload
export const uploadImage = async (req: AuthenticatedRequest, res: Response) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, message: 'No image data provided' });
  }

  // Validate format (header prefix check)
  const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    return res.status(400).json({ success: false, message: 'Invalid image format. Must be a base64 data URI.' });
  }

  const ext = match[1].toLowerCase();
  const data = match[2];

  // Enforce format types
  const allowedExts = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
  if (!allowedExts.includes(ext)) {
    return res.status(400).json({ success: false, message: `Unsupported image type: ${ext}. Supported: png, jpg, jpeg, webp` });
  }

  // Enforce size limit (5MB)
  const sizeBytes = Math.round(data.length * 0.75);
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (sizeBytes > maxBytes) {
    return res.status(400).json({ success: false, message: 'Image size exceeds maximum 5MB limit.' });
  }

  try {
    const buffer = Buffer.from(data, 'base64');
    const filename = `img_${Date.now()}_${Math.round(Math.random() * 1000)}.${ext}`;
    
    // Resolve path to backend/uploads
    const uploadDir = path.resolve(__dirname, '../../uploads');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `http://localhost:5000/uploads/${filename}`;

    return res.status(200).json({
      success: true,
      url: imageUrl,
      filename,
      sizeBytes,
      format: ext
    });
  } catch (error: any) {
    console.error('Image upload controller error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving uploaded image record' });
  }
};
