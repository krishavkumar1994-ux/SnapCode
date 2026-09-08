import express from 'express';
import multer from 'multer';
import { extractCodeFromImage } from '../services/visionService.js';

const router = express.Router();
const supportedMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

function hasImageSignature(buffer, mimeType) {
  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }

  if (mimeType === 'image/jpeg') {
    return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }

  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString() === 'RIFF'
      && buffer.subarray(8, 12).toString() === 'WEBP';
  }

  return false;
}

router.post('/', upload.single('image'), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({
      success: false,
      message: 'Please provide an image file.'
    });
  }

  if (!supportedMimeTypes.has(request.file.mimetype) || !hasImageSignature(request.file.buffer, request.file.mimetype)) {
    return response.status(400).json({
      success: false,
      message: 'The uploaded file must be a valid PNG, JPG, or WebP image.'
    });
  }

  try {
    const code = await extractCodeFromImage(request.file.buffer, request.file.mimetype);
    return response.json({ success: true, code });
  } catch (error) {
    console.error('Code extraction failed:', error.message);

    if (error.code === 'VISION_NOT_CONFIGURED') {
      return response.status(503).json({
        success: false,
        message: 'Code extraction is not configured on the server yet.'
      });
    }

    if (error.code === 'GROQ_AUTH_ERROR') {
      return response.status(502).json({
        success: false,
        message: 'The Groq API key is invalid or does not have access to the vision service.'
      });
    }

    if (error.code === 'GROQ_VISION_MODEL_ERROR') {
      return response.status(502).json({
        success: false,
        message: 'The configured Groq vision model is unavailable.'
      });
    }

    if (error.code === 'GROQ_RATE_LIMIT_ERROR') {
      return response.status(429).json({
        success: false,
        message: 'Groq rate limit reached. Please try again shortly.'
      });
    }

    if (error.code === 'GROQ_REQUEST_ERROR') {
      return response.status(400).json({
        success: false,
        message: 'Groq rejected the image extraction request.'
      });
    }

    return response.status(502).json({
      success: false,
      message: 'The code extraction service could not process this image.'
    });
  }
});

export default router;
