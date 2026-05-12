// Contopia — Book DAO Tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Book } from '../book-model.js';
import * as bookDao from '../book-dao.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../test-utils/db-helpers.js';

describe('Book DAO', () => {
  let authorId;

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  beforeEach(async () => {
    await clearCollections();
    authorId = new mongoose.Types.ObjectId();
  });

  describe('createBook', () => {
    it('should create and return a book document', async () => {
      const book = await bookDao.createBook({
        authorId,
        title: 'New Book',
        description: 'A new book',
      });

      expect(book).toBeDefined();
      expect(book._id).toBeDefined();
      expect(book.title).toBe('New Book');
      expect(book.authorId.toString()).toBe(authorId.toString());

      // Verify it's persisted
      const found = await Book.findById(book._id);
      expect(found).toBeDefined();
    });
  });

  describe('findBookById', () => {
    it('should find an active book by ID', async () => {
      const created = await bookDao.createBook({ authorId, title: 'Find Me' });
      const found = await bookDao.findBookById(created._id);
      expect(found).toBeDefined();
      expect(found.title).toBe('Find Me');
    });

    it('should return null for non-existent ID', async () => {
      const found = await bookDao.findBookById(new mongoose.Types.ObjectId());
      expect(found).toBeNull();
    });

    it('should not return soft-deleted books', async () => {
      const created = await bookDao.createBook({ authorId, title: 'Delete Me' });
      await bookDao.softDeleteBook(created._id);
      const found = await bookDao.findBookById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('findBooksByAuthor', () => {
    it('should return all books for an author', async () => {
      await bookDao.createBook({ authorId, title: 'Book 1' });
      await bookDao.createBook({ authorId, title: 'Book 2' });
      await bookDao.createBook({ authorId, title: 'Book 3' });

      const books = await bookDao.findBooksByAuthor(authorId);
      expect(books).toHaveLength(3);
    });

    it('should return empty array for author with no books', async () => {
      const otherAuthor = new mongoose.Types.ObjectId();
      const books = await bookDao.findBooksByAuthor(otherAuthor);
      expect(books).toEqual([]);
    });

    it('should filter by status', async () => {
      await bookDao.createBook({ authorId, title: 'Draft 1', status: 'draft' });
      await bookDao.createBook({ authorId, title: 'Pub 1', status: 'published' });
      await bookDao.createBook({ authorId, title: 'Pub 2', status: 'published' });

      const drafts = await bookDao.findBooksByAuthor(authorId, { status: 'draft' });
      expect(drafts).toHaveLength(1);

      const published = await bookDao.findBooksByAuthor(authorId, { status: 'published' });
      expect(published).toHaveLength(2);
    });

    it('should not return soft-deleted books', async () => {
      const b1 = await bookDao.createBook({ authorId, title: 'Keep' });
      const b2 = await bookDao.createBook({ authorId, title: 'Remove' });
      await bookDao.softDeleteBook(b2._id);

      const books = await bookDao.findBooksByAuthor(authorId);
      expect(books).toHaveLength(1);
      expect(books[0].title).toBe('Keep');
    });

    it('should respect limit and skip pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await bookDao.createBook({ authorId, title: `Book ${i}` });
      }

      const firstTwo = await bookDao.findBooksByAuthor(authorId, { limit: 2, skip: 0 });
      expect(firstTwo).toHaveLength(2);

      const nextTwo = await bookDao.findBooksByAuthor(authorId, { limit: 2, skip: 2 });
      expect(nextTwo).toHaveLength(2);
      expect(nextTwo[0].title).not.toBe(firstTwo[0].title);
    });

    it('should sort by createdAt descending by default', async () => {
      await bookDao.createBook({ authorId, title: 'First' });
      await new Promise((r) => setTimeout(r, 50));
      await bookDao.createBook({ authorId, title: 'Second' });
      await new Promise((r) => setTimeout(r, 50));
      await bookDao.createBook({ authorId, title: 'Third' });

      const books = await bookDao.findBooksByAuthor(authorId);
      expect(books[0].title).toBe('Third');
      expect(books[2].title).toBe('First');
    });
  });

  describe('updateBookById', () => {
    it('should update a book and return the updated document', async () => {
      const book = await bookDao.createBook({ authorId, title: 'Original' });
      const updated = await bookDao.updateBookById(book._id, { title: 'Updated' });
      expect(updated.title).toBe('Updated');
    });

    it('should not update soft-deleted books', async () => {
      const book = await bookDao.createBook({ authorId, title: 'Gone' });
      await bookDao.softDeleteBook(book._id);
      const updated = await bookDao.updateBookById(book._id, { title: 'Try Update' });
      expect(updated).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const updated = await bookDao.updateBookById(new mongoose.Types.ObjectId(), { title: 'Nope' });
      expect(updated).toBeNull();
    });
  });

  describe('softDeleteBook', () => {
    it('should set deletedAt on the book', async () => {
      const book = await bookDao.createBook({ authorId, title: 'To Delete' });
      const deleted = await bookDao.softDeleteBook(book._id);
      expect(deleted.deletedAt).toBeInstanceOf(Date);
    });

    it('should make book unfindable by findBookById', async () => {
      const book = await bookDao.createBook({ authorId, title: 'Hide Me' });
      await bookDao.softDeleteBook(book._id);
      const found = await bookDao.findBookById(book._id);
      expect(found).toBeNull();
    });
  });

  describe('hardDeleteBook', () => {
    it('should permanently remove a book', async () => {
      const book = await bookDao.createBook({ authorId, title: 'Delete Forever' });
      await bookDao.hardDeleteBook(book._id);
      const found = await Book.findById(book._id);
      expect(found).toBeNull();
    });
  });

  describe('countBooksByAuthor', () => {
    it('should count active books for an author', async () => {
      await bookDao.createBook({ authorId, title: 'A' });
      await bookDao.createBook({ authorId, title: 'B' });
      const count = await bookDao.countBooksByAuthor(authorId);
      expect(count).toBe(2);
    });

    it('should count only non-deleted books', async () => {
      const b1 = await bookDao.createBook({ authorId, title: 'A' });
      await bookDao.createBook({ authorId, title: 'B' });
      await bookDao.softDeleteBook(b1._id);
      const count = await bookDao.countBooksByAuthor(authorId);
      expect(count).toBe(1);
    });

    it('should filter by status when provided', async () => {
      await bookDao.createBook({ authorId, title: 'D', status: 'draft' });
      await bookDao.createBook({ authorId, title: 'P', status: 'published' });
      const draftCount = await bookDao.countBooksByAuthor(authorId, { status: 'draft' });
      expect(draftCount).toBe(1);
    });
  });
});
