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
      const _b1 = await bookDao.createBook({ authorId, title: 'Keep' });
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

    it('should sort published books by publishedAt descending', async () => {
      const now = new Date();
      const b1 = await bookDao.createBook({ authorId, title: 'Pub First', status: 'published', publishedAt: new Date(now.getTime() - 2000) });
      const b2 = await bookDao.createBook({ authorId, title: 'Pub Second', status: 'published', publishedAt: new Date(now.getTime() - 1000) });
      const b3 = await bookDao.createBook({ authorId, title: 'Pub Third', status: 'published', publishedAt: now });

      const books = await bookDao.findBooksByAuthor(authorId, { status: 'published' });
      expect(books[0].title).toBe('Pub Third');
      expect(books[1].title).toBe('Pub Second');
      expect(books[2].title).toBe('Pub First');
    });

    it('should use _id as stable fallback sort for same publishedAt', async () => {
      const sameDate = new Date();
      const b1 = await bookDao.createBook({ authorId, title: 'Earlier ID', status: 'published', publishedAt: sameDate });
      await new Promise((r) => setTimeout(r, 10));
      const b2 = await bookDao.createBook({ authorId, title: 'Later ID', status: 'published', publishedAt: sameDate });

      const books = await bookDao.findBooksByAuthor(authorId, { status: 'published' });
      expect(books[0].title).toBe('Later ID');
      expect(books[1].title).toBe('Earlier ID');
    });

    it('should sort draft books by createdAt descending (not publishedAt)', async () => {
      const now = new Date();
      await Book.create({ authorId, title: 'Oldest Draft', status: 'draft', createdAt: new Date(now.getTime() - 4000) });
      await Book.create({ authorId, title: 'Mid Draft', status: 'draft', createdAt: new Date(now.getTime() - 2000) });
      await Book.create({ authorId, title: 'Newest Draft', status: 'draft', createdAt: now });

      const books = await bookDao.findBooksByAuthor(authorId, { status: 'draft' });
      expect(books).toHaveLength(3);
      expect(books[0].title).toBe('Newest Draft');
      expect(books[1].title).toBe('Mid Draft');
      expect(books[2].title).toBe('Oldest Draft');
      // Verify publishedAt is null — drafts are not sorted by publishedAt
      expect(books[0].publishedAt).toBeNull();
      expect(books[1].publishedAt).toBeNull();
      expect(books[2].publishedAt).toBeNull();
    });

    it('should sort archived books by createdAt descending', async () => {
      const now = new Date();
      await Book.create({ authorId, title: 'Oldest Archived', status: 'archived', createdAt: new Date(now.getTime() - 4000) });
      await Book.create({ authorId, title: 'Mid Archived', status: 'archived', createdAt: new Date(now.getTime() - 2000) });
      await Book.create({ authorId, title: 'Newest Archived', status: 'archived', createdAt: now });

      const books = await bookDao.findBooksByAuthor(authorId, { status: 'archived' });
      expect(books).toHaveLength(3);
      expect(books[0].title).toBe('Newest Archived');
      expect(books[1].title).toBe('Mid Archived');
      expect(books[2].title).toBe('Oldest Archived');
    });

    it('should return books in stable order when no status filter', async () => {
      const now = new Date();
      await Book.create({ authorId, title: 'Draft Book', status: 'draft', createdAt: new Date(now.getTime() - 3000) });
      await Book.create({ authorId, title: 'Published Book', status: 'published', publishedAt: new Date(now.getTime() - 1000), createdAt: new Date(now.getTime() - 2000) });
      await Book.create({ authorId, title: 'Archived Book', status: 'archived', createdAt: now });

      const books = await bookDao.findBooksByAuthor(authorId);
      expect(books).toHaveLength(3);
      // No status filter → sort by createdAt DESC regardless of status
      expect(books[0].title).toBe('Archived Book');
      expect(books[1].title).toBe('Published Book');
      expect(books[2].title).toBe('Draft Book');
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

  describe('findBookWithChapters', () => {
    it('should return book with chapters and total word count', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'Edit Me' });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Hello', wordCount: 5 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 2, title: 'Ch 2', content: 'World', wordCount: 5 });

      // Act
      const result = await bookDao.findBookWithChapters(book._id.toString());

      // Assert
      expect(result).not.toBeNull();
      expect(result.book._id.toString()).toBe(book._id.toString());
      expect(result.chapters).toHaveLength(2);
      expect(result.totalWordCount).toBe(10);
    });

    it('should sort chapters by order ascending', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'Sorted' });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 3, title: 'Ch 3', content: 'C', wordCount: 1 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'A', wordCount: 1 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 2, title: 'Ch 2', content: 'B', wordCount: 1 });

      // Act
      const result = await bookDao.findBookWithChapters(book._id.toString());

      // Assert
      expect(result.chapters[0].title).toBe('Ch 1');
      expect(result.chapters[1].title).toBe('Ch 2');
      expect(result.chapters[2].title).toBe('Ch 3');
    });

    it('should exclude soft-deleted chapters', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'With Deleted Ch' });
      const ch1 = await mongoose.model('Chapter').create({ bookId: book._id, order: 1, title: 'Keep', content: 'A', wordCount: 1 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 2, title: 'Deleted', content: 'B', wordCount: 1, deletedAt: new Date() });

      // Act
      const result = await bookDao.findBookWithChapters(book._id.toString());

      // Assert
      expect(result.chapters).toHaveLength(1);
      expect(result.chapters[0].title).toBe('Keep');
    });

    it('should return null when book is soft-deleted', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'Gone' });
      await bookDao.softDeleteBook(book._id);

      // Act
      const result = await bookDao.findBookWithChapters(book._id.toString());

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for non-existent book ID', async () => {
      // Act
      const result = await bookDao.findBookWithChapters(new mongoose.Types.ObjectId().toString());

      // Assert
      expect(result).toBeNull();
    });

    it('should return book with empty chapters and 0 word count when no chapters exist', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'No Chapters' });

      // Act
      const result = await bookDao.findBookWithChapters(book._id.toString());

      // Assert
      expect(result).not.toBeNull();
      expect(result.chapters).toEqual([]);
      expect(result.totalWordCount).toBe(0);
    });
  });

  describe('findBooksByAuthorWithWordCount', () => {
    it('should return drafts with total word count per book', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'Draft 1', status: 'draft' });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 1, title: 'Ch 1', content: 'Hello world', wordCount: 2 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 2, title: 'Ch 2', content: 'Foo bar baz', wordCount: 3 });

      // Act
      const result = await bookDao.findBooksByAuthorWithWordCount(authorId, { status: 'draft' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]._id.toString()).toBe(book._id.toString());
      expect(result[0].totalWordCount).toBe(5);
      expect(result[0].chapters).toBeUndefined(); // $project removes chapters
    });

    it('should exclude word count of soft-deleted chapters', async () => {
      // Arrange
      const book = await bookDao.createBook({ authorId, title: 'Partial', status: 'draft' });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 1, title: 'Active', content: 'A', wordCount: 1 });
      await mongoose.model('Chapter').create({ bookId: book._id, order: 2, title: 'Deleted', content: 'B', wordCount: 100, deletedAt: new Date() });

      // Act
      const result = await bookDao.findBooksByAuthorWithWordCount(authorId, { status: 'draft' });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalWordCount).toBe(1);
    });

    it('should return empty array when no matching books', async () => {
      // Act
      const result = await bookDao.findBooksByAuthorWithWordCount(authorId, { status: 'draft' });

      // Assert
      expect(result).toEqual([]);
    });

    it('should respect limit and skip pagination', async () => {
      // Arrange
      for (let i = 0; i < 3; i++) {
        await bookDao.createBook({ authorId, title: `Draft ${i}`, status: 'draft' });
      }

      // Act
      const firstTwo = await bookDao.findBooksByAuthorWithWordCount(authorId, { status: 'draft', limit: 2, skip: 0 });
      const lastOne = await bookDao.findBooksByAuthorWithWordCount(authorId, { status: 'draft', limit: 1, skip: 2 });

      // Assert
      expect(firstTwo).toHaveLength(2);
      expect(lastOne).toHaveLength(1);
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
