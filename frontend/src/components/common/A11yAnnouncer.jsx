export default function A11yAnnouncer({ message }) {
  return (
    <span aria-live="polite" role="status" className="sr-only">
      {message}
    </span>
  );
}