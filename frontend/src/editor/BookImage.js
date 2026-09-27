import Image from '@tiptap/extension-image';

export const IMAGE_SIZES = [
  { label: 'Pequena', value: 'small' },
  { label: 'Média', value: 'medium' },
  { label: 'Grande', value: 'large' },
];

// Imagem no meio do texto, com três tamanhos. O tamanho vai no data-size,
// que o servidor aceita e o CSS transforma em largura.
export const BookImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: 'medium',
        parseHTML: (element) => element.getAttribute('data-size') || 'medium',
        renderHTML: (attributes) => ({ 'data-size': attributes.size }),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });
