// Allow-list of accepted file types: extension -> expected MIME type
const ALLOWED_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function validateFile(filename, mimeType, fileSize) {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

  if (!ALLOWED_TYPES[ext]) {
    return { valid: false, reason: `File type "${ext}" is not allowed.` };
  }

  if (ALLOWED_TYPES[ext] !== mimeType) {
    return { valid: false, reason: 'File extension does not match its actual type.' };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { valid: false, reason: 'File exceeds the 10 MB size limit.' };
  }

  return { valid: true };
}

module.exports = { validateFile, ALLOWED_TYPES };