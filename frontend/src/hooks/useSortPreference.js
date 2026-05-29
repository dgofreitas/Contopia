import useBookStore from '../stores/book-store';

export default function useSortPreference() {
  const sortMode = useBookStore((s) => s.sortMode);
  const setSortMode = useBookStore((s) => s.setSortMode);

  return { sortMode, setSortMode };
}