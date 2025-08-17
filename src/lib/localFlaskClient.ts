// Minimal, chainable client for your Flask endpoints (pure fetch)
type OrderOpts = { ascending?: boolean };
type Result<T> = Promise<{ data: T | null; error: any | null }>;

function wrap<T>(p: Promise<any>): Result<T> {
  return p.then((j) => (j?.error ? { data: null, error: j } : { data: j, error: null }))
          .catch((e) => ({ data: null, error: e }));
}

export function createFlaskClient(baseUrl: string) {
  const common: RequestInit = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',              // <<< cookie session!
  };

  function run<T>(url: URL, method: string, body?: any): Result<T> {
    const init: RequestInit = { ...common, method };
    if (body !== undefined) init.body = JSON.stringify(body);
    return wrap(fetch(url.toString(), init).then((r) => r.json()));
  }

  return {
    // ---------- Auth ----------
    auth: {
      signup({ email, password }: { email: string; password: string }) {
        return run(new URL(`${baseUrl}/auth/signup`), 'POST', { email, password });
      },
      signin({ email, password }: { email: string; password: string }) {
        return run(new URL(`${baseUrl}/auth/signin`), 'POST', { email, password });
      },
      signout() {
        return run(new URL(`${baseUrl}/auth/signout`), 'POST');
      },
      session() {
        return run<{ user: { id: string; email: string } | null }>(
          new URL(`${baseUrl}/auth/session`), 'GET'
        );
      },
    },

    // ---------- RPC ----------
    rpc: {
      resetMonthlyCredits() {
        return run<{ v1:number; v2:number; v3:number }>(
          new URL(`${baseUrl}/rpc/reset_monthly_credits`), 'POST', {}
        );
      },
      resetMonthlyOcrCredits() {
        return run<{ ocr_bill:number; ocr_bank:number }>(
          new URL(`${baseUrl}/rpc/reset_monthly_ocr_credits`), 'POST', {}
        );
      },
      chatRouter(args: {
        action: 'send' | 'regenerate',
        version: 'V1' | 'V2' | 'V3',
        chatId?: string,
        text?: string,
        lastUserText?: string,
      }) {
        return run<{
          assistant?: any;
          credits?: { v1:number; v2:number; v3:number };
          error?: string;
        }>(new URL(`${baseUrl}/functions/chat-router`), 'POST', args);
      },
      contactSupport(payload: { subject: string; message: string }) {
        return run<{ ok: boolean }>(new URL(`${baseUrl}/functions/contact-support`), 'POST', payload);
      },
    },

    // ---------- Storage ----------
    storage: {
      async upload(bucket: string, path: string, file: File) {
        const url = new URL(`${baseUrl}/storage/${bucket}/upload`);
        const fd = new FormData();
        fd.set('path', path);
        fd.set('file', file);
        const res = await fetch(url, { method: 'POST', credentials: 'include', body: fd });
        const j = await res.json();
        if (!res.ok || j?.error) throw new Error(j?.error || res.statusText);
        return j as { path: string; publicUrl: string };
      },
    },

    // ---------- DB (chainable, like Supabase) ----------
    from(table: string) {
      const url = new URL(`${baseUrl}/db/${table}`);
      let method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET';
      let body: any | undefined = undefined;

      const exec = <T>() => run<T>(url, method, body);

      const builder: any = {
        eq(col: string, val: any) {
          url.searchParams.set(`eq.${col}`, String(val));
          return builder;
        },

        select(_cols = '*') {
          return {
            order(col: string, opts?: OrderOpts) {
              const dir = opts?.ascending === false ? 'desc' : 'asc';
              url.searchParams.set('order', `${col}.${dir}`);
              return exec<any[]>();
            },
            single() {
              return exec<any[]>().then(({ data, error }) => ({
                data: Array.isArray(data) ? (data[0] ?? null) : (data ?? null),
                error,
              }));
            },
            then(onFulfilled: any, onRejected: any) {
              return exec<any[]>().then(onFulfilled, onRejected);
            },
          };
        },

        insert(values: any) {
          method = 'POST';
          body = Array.isArray(values) ? values : [values];
          return {
            select() {
              return exec<any>();  // created rows
            },
          };
        },

        update(values: any) {
          method = 'PATCH';
          body = values;
          return exec<{ updated: number }>();
        },

        delete() {
          method = 'DELETE';
          return exec<{ deleted: number }>();
        },
      };

      return builder;
    },
  };
}
