import multer from 'multer';

import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

const ACCEPTED_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel', // what Windows reports for .csv
  'application/octet-stream',
]);

/**
 * In-memory CSV upload. Files are parsed immediately and never written to disk,
 * which keeps the service stateless and deployable to ephemeral hosts.
 */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const hasCsvExtension = /\.csv$/i.test(file.originalname ?? '');
    if (!hasCsvExtension || !ACCEPTED_MIME_TYPES.has(file.mimetype)) {
      cb(ApiError.badRequest('Only .csv files are accepted for dataset upload.'));
      return;
    }
    cb(null, true);
  },
}).single('file');

/** Wraps multer so its errors become consistent `ApiError` responses. */
export const uploadCsv = (req, res, next) =>
  csvUpload(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return next(
          ApiError.badRequest(
            `The file is larger than the ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB upload limit.`,
          ),
        );
      }
      return next(ApiError.badRequest(`Upload failed: ${error.message}`));
    }
    return next(error);
  });

export default uploadCsv;
