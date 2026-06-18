// CJS wrapper for pdfjs-dist — avoids Node.js 22 ESM/webpack assertion bug
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
module.exports = pdfjsLib;
