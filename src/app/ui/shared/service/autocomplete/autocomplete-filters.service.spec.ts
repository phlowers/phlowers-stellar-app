import { filterElements } from './autocomplete-filters.service';

describe('filterElements', () => {
  // Test data types
  interface TestElement {
    id: number;
    name: string;
    category: string;
    description?: string;
    tags: string[];
    isActive: boolean;
  }

  const testElements: TestElement[] = [
    {
      id: 1,
      name: 'JavaScript Framework',
      category: 'Frontend',
      description: 'A modern JavaScript framework',
      tags: ['javascript', 'frontend', 'framework'],
      isActive: true
    },
    {
      id: 2,
      name: 'Python Library',
      category: 'Backend',
      description: 'A powerful Python library',
      tags: ['python', 'backend', 'library'],
      isActive: false
    },
    {
      id: 3,
      name: 'React Component',
      category: 'Frontend',
      description: 'A reusable React component',
      tags: ['react', 'frontend', 'component'],
      isActive: true
    },
    {
      id: 4,
      name: 'Node.js Server',
      category: 'Backend',
      description: 'A Node.js server application',
      tags: ['nodejs', 'backend', 'server'],
      isActive: true
    }
  ];

  describe('basic filtering', () => {
    it('should return all elements when no filters are applied', () => {
      const filters: Partial<TestElement> = {};
      const result = filterElements(testElements, filters);

      expect(result).toEqual(testElements);
      expect(result).toHaveLength(4);
    });

    it('should filter by name', () => {
      const filters: Partial<TestElement> = { name: 'JavaScript' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('JavaScript Framework');
    });

    it('should filter by category', () => {
      const filters: Partial<TestElement> = { category: 'Frontend' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.name)).toEqual([
        'JavaScript Framework',
        'React Component'
      ]);
    });

    it('should filter by multiple properties', () => {
      const filters: Partial<TestElement> = {
        category: 'Backend',
        isActive: true
      };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Node.js Server');
    });
  });

  describe('case sensitivity and partial matching', () => {
    it('should perform case-insensitive matching', () => {
      const filters: Partial<TestElement> = { name: 'javascript' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('JavaScript Framework');
    });

    it('should match partial strings', () => {
      const filters: Partial<TestElement> = { name: 'React' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('React Component');
    });

    it('should match at the beginning of strings', () => {
      const filters: Partial<TestElement> = { name: 'Node' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Node.js Server');
    });

    it('should match in the middle of strings', () => {
      const filters: Partial<TestElement> = { name: 'Library' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Python Library');
    });
  });

  describe('edge cases', () => {
    it('should handle empty elements array', () => {
      const filters: Partial<TestElement> = { name: 'test' };
      const result = filterElements([], filters);

      expect(result).toEqual([]);
    });

    it('should handle filters with empty strings', () => {
      const filters: Partial<TestElement> = { name: '' };
      const result = filterElements(testElements, filters);

      expect(result).toEqual(testElements);
      expect(result).toHaveLength(4);
    });

    it('should handle filters with whitespace-only strings', () => {
      const filters: Partial<TestElement> = { name: '   ' };
      const result = filterElements(testElements, filters);

      expect(result).toEqual(testElements);
      expect(result).toHaveLength(4);
    });

    it('should handle missing properties in elements', () => {
      const elementsWithMissingProps = [
        { id: 1, name: 'Test' },
        { id: 2, name: 'Another Test', category: 'Test' }
      ];

      const filters: Partial<{ id: number; name: string; category?: string }> =
        { category: 'Test' };
      const result = filterElements(elementsWithMissingProps, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Another Test');
    });

    it('should handle null and undefined values in elements', () => {
      const elementsWithNulls = [
        { id: 1, name: 'Test', description: null },
        { id: 2, name: 'Another', description: undefined },
        { id: 3, name: 'Valid', description: 'Valid description' }
      ];

      const filters: Partial<{
        id: number;
        name: string;
        description: string | null | undefined;
      }> = { description: 'Valid' };
      const result = filterElements(elementsWithNulls, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Valid');
    });

    it('should handle non-string values in elements', () => {
      const filters: Partial<TestElement> = { isActive: true };
      const result = filterElements(testElements, filters);

      // Should convert boolean to string for comparison
      expect(result).toHaveLength(3);
      expect(result.every((e) => e.isActive === true)).toBe(true);
    });

    it('should handle array values in elements', () => {
      const filters: Partial<TestElement> = { tags: 'javascript' as any };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('JavaScript Framework');
    });
  });

  describe('complex filtering scenarios', () => {
    it('should filter by description when present', () => {
      const filters: Partial<TestElement> = { description: 'Python' };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Python Library');
    });

    it('should handle multiple filter criteria with mixed results', () => {
      const filters: Partial<TestElement> = {
        category: 'Frontend',
        name: 'React'
      };
      const result = filterElements(testElements, filters);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('React Component');
    });

    it('should return empty array when no matches found', () => {
      const filters: Partial<TestElement> = {
        name: 'NonExistent',
        category: 'Invalid'
      };
      const result = filterElements(testElements, filters);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('type safety', () => {
    it('should work with different element types', () => {
      interface User {
        id: string;
        email: string;
        role: string;
      }

      const users: User[] = [
        { id: '1', email: 'admin@example.com', role: 'admin' },
        { id: '2', email: 'user@example.com', role: 'user' },
        { id: '3', email: 'moderator@example.com', role: 'moderator' }
      ];

      const filters: Partial<User> = { role: 'admin' };
      const result = filterElements(users, filters);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('admin@example.com');
    });

    it('should preserve original element structure', () => {
      const filters: Partial<TestElement> = { name: 'JavaScript' };
      const result = filterElements(testElements, filters);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('category');
      expect(result[0]).toHaveProperty('description');
      expect(result[0]).toHaveProperty('tags');
      expect(result[0]).toHaveProperty('isActive');
    });
  });
});
