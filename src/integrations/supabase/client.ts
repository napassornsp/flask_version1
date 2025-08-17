// Pure Flask API client that mimics the subset of Supabase used by this app.
// Chainable: .from().select().order().eq().limit().range().single()/maybeSingle()
// Writes:    .insert(...).select().single(), .update(...).eq(), .delete().eq()
// Auth:      auth.getUser/getSession/signInWithPassword/signUp/signOut/onAuthStateChange
// RPC:       supabase.rpc('fn', {...})
// Functions: supabase.functions.invoke('chat-router', { body })
// Storage:   supabase.storage.from(bucket).upload(path, file), getPublicUrl(path)

let __currentSession: any = null;

// IMPORTANT: for dev, go through Vite proxy so cookies are same-origin
const API_BASE =
  (typeof window !== "undefined" &&
    (localStorage.getItem("FLASK_API_URL") || "/api")) ||
  "/api";

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`.replace(/\/+$/, ""), {
    credentials: "include",
    headers: {
      ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    return { data: null, error: (data && (data.error || data)) || res.statusText };
  }
  return { data, error: null };
}

function makeQueryBuilder(table: string) {
  const state: {
    filters: Record<string, any>;
    order: { column: string; ascending: boolean } | null;
    range: { from: number; to: number } | null;
    limit: number | null;
    method: "GET" | "POST" | "PATCH" | "DELETE";
    payload: any;
  } = {
    filters: {},
    order: null,
    range: null,
    limit: null,
    method: "GET",
    payload: null,
  };

  const buildQS = () => {
    const params = new URLSearchParams();
    Object.entries(state.filters).forEach(([k, v]) => params.append(`eq.${k}`, String(v)));
    if (state.order) params.append("order", `${state.order.column}.${state.order.ascending ? "asc" : "desc"}`);
    if (state.range) {
      params.append("from", String(state.range.from));
      params.append("to", String(state.range.to));
    } else if (state.limit != null) {
      params.append("from", "0");
      params.append("to", String(Math.max(0, state.limit - 1)));
    }
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const run = () => {
    const url = `/db/${table}${buildQS()}`;
    switch (state.method) {
      case "POST":
        return api(url, { method: "POST", body: JSON.stringify(state.payload) });
      case "PATCH":
        return api(url, { method: "PATCH", body: JSON.stringify(state.payload) });
      case "DELETE":
        return api(url, { method: "DELETE" });
      default:
        return api(url);
    }
  };

  const builder: any = {
    // READS
    select(_columns?: string) {
      // columns are ignored by Flask shim, but we preserve the call
      return builder; // KEEP CHAINING
    },
    order(column: string, opts?: { ascending?: boolean }) {
      // Supabase default is ascending: true
      state.order = { column, ascending: opts?.ascending ?? true };
      return builder;
    },
    range(from: number, to: number) {
      state.range = { from, to };
      return builder;
    },
    limit(n: number) {
      state.limit = n;
      return builder;
    },
    eq(column: string, value: any) {
      state.filters[column] = value;
      return builder;
    },

    // WRITES
    insert(payload: any) {
      state.method = "POST";
      state.payload = payload;
      return builder; // allow .select().single() after insert
    },
    update(payload: any) {
      state.method = "PATCH";
      state.payload = payload;
      return builder; // allow .eq(...).single() etc.
    },
    delete() {
      state.method = "DELETE";
      return {
        eq: async (column: string, value: any) => {
          state.filters[column] = value;
          return run();
        },
      };
    },

    // RESULT HELPERS
    async single() {
      const res: any = await run();
      if (res.error) return res;
      if (Array.isArray(res.data)) {
        return { data: res.data[0] ?? null, error: null };
      }
      return res;
    },
    async maybeSingle() {
      const res: any = await run();
      if (res.error) return res;
      if (Array.isArray(res.data)) {
        return { data: res.data[0] ?? null, error: null };
      }
      return res;
    },

    // Make builder awaitable (optional)
    then(onFulfilled: any, onRejected: any) {
      return run().then(onFulfilled, onRejected);
    },
    catch(onRejected: any) {
      return run().catch(onRejected);
    },
    finally(onFinally: any) {
      return run().finally(onFinally);
    },
  };

  return builder;
}

export const supabase: any = {
  // ---------- Auth ----------
  auth: {
    async getUser() {
      const { data, error } = await api("/auth/session");
      return { data: { user: data?.user ?? null }, error };
    },
    async getSession() {
      const { data, error } = await api("/auth/session");
      const session = data?.user ? { user: data.user } : null;
      __currentSession = session;
      return { data: { session }, error };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      let last = JSON.stringify(__currentSession || null);
      const timer = setInterval(async () => {
        const { data } = await api("/auth/session");
        const next = data?.user ? { user: data.user } : null;
        const nextStr = JSON.stringify(next);
        if (nextStr !== last) {
          last = nextStr;
          __currentSession = next;
          callback(next ? "SIGNED_IN" : "SIGNED_OUT", next);
        }
      }, 1500);
      return { data: { subscription: { unsubscribe: () => clearInterval(timer) } } } as any;
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const res = await api("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
      if (!res.error) __currentSession = { user: (res.data as any).user };
      return res.error ? { data: null, error: res.error } : { data: { user: (res.data as any).user }, error: null };
    },
    async signUp({ email, password }: { email: string; password: string }) {
      const res = await api("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
      return res.error ? { data: null, error: res.error } : { data: { user: (res.data as any).user }, error: null };
    },
    async signOut() {
      const res = await api("/auth/signout", { method: "POST" });
      __currentSession = null;
      return res.error ? { error: res.error } : { error: null };
    },
    async updateUser(payload: any) {
      const res = await api("/auth/update_user", { method: "POST", body: JSON.stringify(payload) });
      return res.error ? { data: null, error: res.error } : { data: res.data, error: null };
    },
  },

  // ---------- DB ----------
  from(table: string) {
    return makeQueryBuilder(table);
  },

  // ---------- Edge Functions (mapped to Flask) ----------
  functions: {
    async invoke(name: string, { body }: { body?: any } = {}) {
      const res = await api(`/functions/${name}`, { method: "POST", body: JSON.stringify(body || {}) });
      return res.error ? { data: null, error: res.error } : { data: res.data, error: null };
    },
  },

  // ---------- RPC ----------
  async rpc(fn: string, params?: any) {
    const res = await api(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(params || {}) });
    return res.error ? { data: null, error: res.error } : { data: res.data, error: null };
  },

  // ---------- Storage ----------
  storage: {
    from(bucket: string) {
      return {
        async upload(path: string, file: File | Blob) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("path", path);
          return api(`/storage/${bucket}/upload`, { method: "POST", body: fd });
        },
        getPublicUrl(path: string) {
          const url = `${API_BASE}/storage/${bucket}/public/${encodeURIComponent(path)}`;
          return { data: { publicUrl: url } };
        },
      };
    },
  },
};

// No exported Supabase types
export type {};
