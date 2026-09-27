import { besideColumn, markColumnText, readWidth } from '../editor/imageLayout';

describe('imagem na página', () => {
  it('o texto depois de uma imagem em coluna fica ao lado dela até a próxima imagem', () => {
    const blocks = ['p1', { align: 'left', wrap: 'column' }, 'p2', 'p3', { align: 'center' }, 'p4', { align: 'right', wrap: 'around' }, 'p5'];
    expect(besideColumn(blocks, (b) => (typeof b === 'string' ? null : b))).toEqual(['p2', 'p3']);
  });

  it('marca o texto também no HTML da leitura', () => {
    const div = document.createElement('div');
    div.innerHTML = '<p>a</p><img data-align="right" data-wrap="column"><p>b</p><img data-align="left" data-wrap="around"><p>c</p>';
    markColumnText(div);
    expect(Array.from(div.querySelectorAll('.beside-column')).map((p) => p.textContent)).toEqual(['b']);
  });

  it('lê a largura em % e os tamanhos antigos', () => {
    const img = document.createElement('img');
    img.style.width = '42%';
    expect(readWidth(img)).toBe(42);
    const old = document.createElement('img');
    old.setAttribute('data-size', 'small');
    expect(readWidth(old)).toBe(35);
  });
});
