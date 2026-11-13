import { readPhrase, drawPrint } from './instax.js';

const printer = document.querySelector('.underdesk-printer');
const button = printer.querySelector('button');
const paper = printer.querySelector('a');
button.addEventListener('click', () => {
  const phrase = readPhrase();
  drawPrint(paper.querySelector('canvas'), phrase.notes);
  paper.querySelector('.instax-caption').textContent = phrase.demo ? 'Play demo' : 'Play phrase';
  paper.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  paper.focus({ preventScroll: true });
});
