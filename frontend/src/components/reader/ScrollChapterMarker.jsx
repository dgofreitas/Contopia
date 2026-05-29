import { useEffect, useRef } from 'react';
import { sanitizeRichContent } from '../../lib/sanitize';

/**
 * ScrollChapterMarker — renders a single chapter within the scroll flow.
 *
 * @param {Object} props
 * @param {Object} props.chapter - Chapter object with _id, title, content
 * @param {number} props.index - Chapter index in the book
 * @param {Function} props.onVisible - Callback(index) when chapter header becomes visible
 * @param {string} props.fontSize - Font size key ('small'|'medium'|'large')
 * @param {string} props.themeProseClass - Prose theme class string
 * @param {Function} props.observeRef - Callback to register element with IntersectionObserver
 */
const FONT_SIZE_SCALE = {
  small: '87.5%',
  medium: '100%',
  large: '150%',
};

export default function ScrollChapterMarker({ chapter, index, onVisible, fontSize, themeProseClass, observeRef }) {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const hasAnnouncedRef = useRef(false);

  // Set up individual IntersectionObserver for chapter heading visibility
  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && onVisible) {
          onVisible(index);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(heading);
    return () => observer.disconnect();
  }, [index, onVisible]);

  // Register with parent observer if provided
  useEffect(() => {
    if (observeRef && sectionRef.current) {
      const cleanup = observeRef(sectionRef.current, index);
      return cleanup;
    }
  }, [observeRef, index]);

  // Screen reader announcement on first visibility
  useEffect(() => {
    if (hasAnnouncedRef.current) return;

    const heading = headingRef.current;
    if (!heading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnnouncedRef.current) {
          hasAnnouncedRef.current = true;
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  const headingId = `chapter-heading-${chapter._id}`;
  const fontSizeScale = FONT_SIZE_SCALE[fontSize] || '100%';

  return (
    <div
      id={`chapter-${chapter._id}`}
      ref={sectionRef}
      role="article"
      aria-labelledby={headingId}
      className="scroll-chapter-marker"
    >
      <h2
        id={headingId}
        ref={headingRef}
        className={`text-2xl font-bold mb-6 pt-8 pb-4 border-b ${themeProseClass}`}
      >
        {chapter.title}
      </h2>
      <div
        className={`prose prose-lg max-w-none ${themeProseClass}`}
        style={{ fontSize: fontSizeScale }}
        dangerouslySetInnerHTML={{ __html: sanitizeRichContent(chapter.content) }}
        tabIndex={0}
      />
    </div>
  );
}