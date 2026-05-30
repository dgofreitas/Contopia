import { animate } from './animate.js';

export function stagger(elements, options = {}) {
  const { perElement = 50, ...animateOptions } = options;
  const handles = [];

  elements.forEach((element, index) => {
    const delay = index * perElement;

    if (delay === 0) {
      handles.push(animate(element, animateOptions));
    } else {
      let handle = null;
      const timeoutId = setTimeout(() => {
        handle = animate(element, animateOptions);
      }, delay);

      handles.push({
        cancel() {
          clearTimeout(timeoutId);
          if (handle) handle.cancel();
        },
        onComplete(cb) {
          if (handle) {
            handle.onComplete(cb);
          } else {
            setTimeout(() => {
              if (handle) handle.onComplete(cb);
            }, delay + 10);
          }
        },
      });
    }
  });

  return handles;
}