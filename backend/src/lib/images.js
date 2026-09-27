const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { badRequest } = require('./errors');

// Tipos que a criança pode enviar. Tudo vira WebP no servidor.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// Largura máxima guardada: cabe numa página do livro mesmo em tela grande.
const MAX_WIDTH = 1200;
// Fotos de celular têm 12+ megapixels; acima disso é arquivo estranho.
const MAX_INPUT_PIXELS = 50_000_000;

/**
 * Redimensiona e converte para WebP. Ao reencodar, os metadados (EXIF, GPS da
 * foto) ficam para trás, e um arquivo que não é imagem de verdade é recusado.
 * GIF animado continua animado.
 */
async function processImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  } catch {
    throw badRequest('IMAGE_INVALID');
  }
  if (!['png', 'jpeg', 'webp', 'gif'].includes(meta.format)) throw badRequest('IMAGE_TYPE');

  const animated = (meta.pages || 1) > 1;
  try {
    const { data, info } = await sharp(buffer, { animated, limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.pageHeight || info.height };
  } catch {
    throw badRequest('IMAGE_INVALID');
  }
}

// Onde ficam os arquivos: <uploads>/books/<livro>/<nome>.webp
function createImageStore(uploadsDir) {
  const bookDir = (bookId) => path.join(uploadsDir, 'books', String(bookId));

  return {
    async save(bookId, data) {
      const file = `${crypto.randomBytes(12).toString('hex')}.webp`;
      await fs.mkdir(bookDir(bookId), { recursive: true });
      await fs.writeFile(path.join(bookDir(bookId), file), data);
      return file;
    },
    pathOf(bookId, file) {
      return path.join(bookDir(bookId), path.basename(file));
    },
    async remove(bookId, file) {
      await fs.rm(path.join(bookDir(bookId), path.basename(file)), { force: true });
    },
    async removeBook(bookId) {
      await fs.rm(bookDir(bookId), { recursive: true, force: true });
    },
  };
}

module.exports = { IMAGE_TYPES, MAX_UPLOAD_BYTES, processImage, createImageStore };
