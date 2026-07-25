// src/lib/supabase/client.ts
export const supabase = {
  from: (table: string) => ({
    insert: (data: any) => ({
      then: (callback: any) => {
        console.log(`[Supabase] Insert into ${table}:`, data);
        return callback({ data, error: null });
      }
    }),
    select: (columns?: string) => ({
      eq: (column: string, value: any) => ({
        then: (callback: any) => {
          console.log(`[Supabase] Select from ${table} where ${column}=${value}`);
          return callback({ data: [], error: null });
        }
      })
    })
  })
};

export const supabaseAuth = {
  getUser: async () => {
    return { data: { user: null }, error: null };
  },
  getSession: async () => {
    return { data: { session: null }, error: null };
  }
};
