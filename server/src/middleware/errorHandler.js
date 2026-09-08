import multer from 'multer';

export function errorHandler(error, _request, response, _next) {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Images must be smaller than 10 MB.'
      : 'The uploaded image could not be processed.';

    return response.status(400).json({ success: false, message });
  }

  console.error('Unhandled server error:', error.message);
  return response.status(500).json({
    success: false,
    message: 'The server could not process the request.'
  });
}
