import { type UserRole } from './supabase';

// This is a minimal mock of the Supabase client for demo purposes
// It allows the app to run even if the API key is missing or invalid.

const mockUser = {
  id: 'mock-user-id',
  email: 'demo@example.com',
  role: 'admin' as UserRole,
  must_change_password: false,
  user_metadata: { name: 'Demo User' }
};

// Simple state manager for mock auth
let currentSession = { user: mockUser };
const listeners = new Set<(event: string, session: any) => void>();

// In-memory storage with localStorage persistence
const getStorageData = () => {
  const data = localStorage.getItem('klevlup_mock_data');
  if (data) return JSON.parse(data);
  return {
    profiles: [{ ...mockUser }],
    classes: [],
    enrollments: [],
    teachers: [],
    students: [],
    subjects: [],
    lectures: [],
    attendance: [],
    exams: [],
    results: [],
    announcements: []
  };
};

let mockData = getStorageData();

const saveStorageData = () => {
  localStorage.setItem('klevlup_mock_data', JSON.stringify(mockData));
};

const notifyListeners = (event: string) => {
  listeners.forEach(callback => callback(event, currentSession));
};

export const mockSupabase = {
  auth: {
    signInWithPassword: async ({ email }: { email: string }) => {
      console.log('Mock: Signing in with', email);
      const profile = mockData.profiles.find((p: any) => p.email === email);
      const user = profile ? { ...profile, id: profile.id || 'mock-user-id' } : mockUser;
      currentSession = { user };
      notifyListeners('SIGNED_IN');
      return { data: { user }, error: null };
    },
    signOut: async () => {
      console.log('Mock: Signing out');
      currentSession = { user: null as any };
      notifyListeners('SIGNED_OUT');
      return { error: null };
    },
    getSession: async () => {
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      listeners.add(callback);
      // Initial call
      callback(currentSession.user ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession);
      return { 
        data: { 
          subscription: { 
            unsubscribe: () => {
              listeners.delete(callback);
            } 
          } 
        } 
      };
    },
    getUser: async () => {
      return { data: { user: currentSession.user }, error: null };
    }
  },
  from: (table: string) => {
    console.log('Mock: Accessing table', table);
    const tableData = mockData[table] || [];

    const createPromise = (data: any) => {
      const promise = Promise.resolve({ data, error: null });
      return Object.assign(promise, {
        eq: () => promise,
        single: () => promise,
        order: () => promise,
        limit: () => promise,
        select: () => promise,
      });
    };

    return {
      select: (columns?: string) => {
        let queryData = [...tableData];
        
        // Basic join support for mock mode
        if (columns && columns.includes(':')) {
          queryData = queryData.map(item => {
            const newItem = { ...item };
            
            // Handle profile join
            if (columns.includes('profile:profiles')) {
              newItem.profile = mockData.profiles.find((p: any) => p.id === item.profile_id);
            }
            
            // Handle class join
            if (columns.includes('class:classes')) {
              newItem.class = mockData.classes.find((c: any) => c.id === item.class_id);
            }
            
            // Handle subject join
            if (columns.includes('subject:subjects')) {
              newItem.subject = mockData.subjects.find((s: any) => s.id === item.subject_id);
            }

            // Handle student join (for attendance/results)
            if (columns.includes('student:students')) {
              const student = mockData.students.find((s: any) => s.id === item.student_id);
              if (student) {
                newItem.student = {
                  ...student,
                  profile: mockData.profiles.find((p: any) => p.id === student.profile_id)
                };
              }
            }

            // Handle teacher join
            if (columns.includes('teacher:teachers')) {
              const teacher = mockData.teachers.find((t: any) => t.id === item.teacher_id);
              if (teacher) {
                newItem.teacher = {
                  ...teacher,
                  profile: mockData.profiles.find((p: any) => p.id === teacher.profile_id)
                };
              }
            }

            return newItem;
          });
        }

        const builder: any = {
          eq: (column: string, value: any) => {
            queryData = queryData.filter(item => item[column] === value);
            return builder;
          },
          order: (column: string, { ascending = true } = {}) => {
            queryData.sort((a, b) => {
              if (a[column] < b[column]) return ascending ? -1 : 1;
              if (a[column] > b[column]) return ascending ? 1 : -1;
              return 0;
            });
            return builder;
          },
          limit: (count: number) => {
            queryData = queryData.slice(0, count);
            return builder;
          },
          single: () => {
            const promise = Promise.resolve({ data: queryData[0] || null, error: null });
            return Object.assign(promise, {
              eq: () => promise,
              order: () => promise,
            });
          },
          gte: (column: string, value: any) => {
            queryData = queryData.filter(item => item[column] >= value);
            return builder;
          },
          in: (column: string, values: any[]) => {
            queryData = queryData.filter(item => values.includes(item[column]));
            return builder;
          },
          then: (onfulfilled?: any) => {
            return Promise.resolve({ data: queryData, error: null }).then(onfulfilled);
          }
        };
        return builder;
      },
      insert: (data: any) => {
        const newItems = Array.isArray(data) ? data : [data];
        const itemsWithId = newItems.map(item => ({
          id: item.id || Math.random().toString(36).substr(2, 9),
          created_at: item.created_at || new Date().toISOString(),
          ...item
        }));
        
        mockData[table] = [...(mockData[table] || []), ...itemsWithId];
        saveStorageData();

        const result = { data: itemsWithId, error: null };
        const promise = Promise.resolve(result);
        
        return Object.assign(promise, {
          select: () => {
            const selectPromise = Promise.resolve({ data: itemsWithId[0], error: null });
            return Object.assign(selectPromise, {
              single: () => selectPromise
            });
          }
        });
      },
      upsert: (data: any) => {
        const items = Array.isArray(data) ? data : [data];
        const updatedItems: any[] = [];
        
        items.forEach(item => {
          const existingIndex = mockData[table].findIndex((existing: any) => 
            (item.id && existing.id === item.id) || (item.email && existing.email === item.email)
          );
          
          if (existingIndex >= 0) {
            mockData[table][existingIndex] = { ...mockData[table][existingIndex], ...item };
            updatedItems.push(mockData[table][existingIndex]);
          } else {
            const newItem = {
              id: item.id || Math.random().toString(36).substr(2, 9),
              created_at: item.created_at || new Date().toISOString(),
              ...item
            };
            mockData[table].push(newItem);
            updatedItems.push(newItem);
          }
        });
        
        saveStorageData();
        return Promise.resolve({ data: updatedItems, error: null });
      },
      update: (data: any) => {
        let updatedData: any[] = [];
        const builder: any = {
          eq: (column: string, value: any) => {
            mockData[table] = tableData.map(item => {
              if (item[column] === value) {
                const updated = { ...item, ...data };
                updatedData.push(updated);
                return updated;
              }
              return item;
            });
            saveStorageData();
            return builder;
          },
          then: (onfulfilled?: any) => {
            return Promise.resolve({ data: updatedData, error: null }).then(onfulfilled);
          }
        };
        return builder;
      },
      delete: () => {
        let deletedData: any[] = [];
        const builder: any = {
          eq: (column: string, value: any) => {
            deletedData = tableData.filter(item => item[column] === value);
            mockData[table] = tableData.filter(item => item[column] !== value);
            saveStorageData();
            return builder;
          },
          then: (onfulfilled?: any) => {
            return Promise.resolve({ data: deletedData, error: null }).then(onfulfilled);
          }
        };
        return builder;
      }
    };
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        console.log(`Mock: Uploading ${file.name} to ${bucket}/${path}`);
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => ({
        data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` }
      })
    }),
    listBuckets: async () => {
      console.log('Mock: Listing buckets');
      return { data: [{ name: 'notes' }], error: null };
    },
    createBucket: async (name: string) => {
      console.log('Mock: Creating bucket', name);
      return { data: { name }, error: null };
    }
  }
};
