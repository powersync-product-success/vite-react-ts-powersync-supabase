import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  CrudEntry,
  UpdateType,
  type PowerSyncBackendConnector,
} from "@powersync/web";

import {
  SupabaseClient,
  createClient,
  type PostgrestSingleResponse,
  type Session,
} from "@supabase/supabase-js";

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl: string;
};

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp("^22...$"),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp("^23...$"),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp("^42501$"),
];

export type SupabaseConnectorListener = {
  initialized: () => void;
  sessionStarted: (session: Session) => void;
};

export class SupabaseConnector
  extends BaseObserver<SupabaseConnectorListener>
  implements PowerSyncBackendConnector {
  readonly client: SupabaseClient;
  readonly config: SupabaseConfig;

  ready: boolean;
  currentSession: Session | null;
  private initializationPromise: Promise<void>;
  private signingIn: boolean = false;

  constructor() {
    super();
    this.config = {
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      powersyncUrl: import.meta.env.VITE_POWERSYNC_URL,
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    this.client = createClient(
      this.config.supabaseUrl,
      this.config.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    );
    this.currentSession = null;
    this.ready = false;

    // Restore session from localStorage
    this.initializationPromise = this.initializeSession();
  }

  private async initializeSession(): Promise<void> {
    try {
      const { data, error } = await this.client.auth.getSession();
      if (error) {
        console.error("Failed to restore session:", error);
      } else if (data?.session) {
        console.log("Restored session:", data.session);
        this.updateSession(data.session);
      }
    } catch (error) {
      console.error("Error during session initialization:", error);
    }
  }

  /**
   * We suggest you use the following function if you want to support login via username and password.
   * Note: this app is currently authenticating using an anonymous login.
   */
  // async login(username: string, password: string) {
  //   const {
  //     data: { session },
  //     error
  //   } = await this.client.auth.signInWithPassword({
  //     email: username,
  //     password: password
  //   });

  //   if (error) {
  //     throw error;
  //   }

  //   this.updateSession(session);
  // }

  async signInAnonymously() {
    // Wait for initialization to complete first
    await this.initializationPromise;
    
    // Check if we already have a valid session
    if (this.currentSession) {
      return this.currentSession;
    }

    // Prevent concurrent sign-in attempts
    if (this.signingIn) {
      console.log("Already signing in, waiting...");
      // Wait for the current sign-in to complete
      while (this.signingIn) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.currentSession;
    }

    try {
      this.signingIn = true;
      
      // Double-check session after acquiring lock
      if (this.currentSession) {
        console.log("Session acquired while waiting");
        return this.currentSession;
      }

      const {
        data: { session },
        error
      } = await this.client.auth.signInAnonymously();

      if (error) {
        throw error;
      }

      console.log("Signed in anonymously:", session);
      this.updateSession(session);

      return session;
    } finally {
      this.signingIn = false;
    }
  }

  async logout() {
    await this.client.auth.signOut();
    this.updateSession(null);
  }

  updateSession(session: Session | null) {
    this.currentSession = session;
    if (!session) {
      return;
    }
    this.iterateListeners((cb) => cb.sessionStarted?.(session));
  }

  async fetchCredentials() {
    const {
      data: { session },
      error
    } = await this.client.auth.getSession();

    if (!session || error) {
      throw new Error(`Could not fetch Supabase credentials: ${error}`);
    }

    console.debug('session expires at', session.expires_at);

    if (session == null) {
      throw new Error(`Failed to get Supabase session`);
    }

    return {
      endpoint: this.config.powersyncUrl,
      token: session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      // Note: If transactional consistency is important, use database functions
      // or edge functions to process the entire transaction in a single call.
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: PostgrestSingleResponse<null>;
        switch (op.op) {
          case UpdateType.PUT:
            result = await table.upsert({ ...op.opData, id: op.id });
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData).eq("id", op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        if (result.error) {
          console.error(result.error);
          result.error.message = `Could not update Supabase. Received error: ${result.error.message}`;
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (ex: unknown) {
      console.debug(ex);
      const error = ex as { code?: string };
      if (
        typeof error.code === "string" &&
        FATAL_RESPONSE_CODES.some((regex) => regex.test(error.code!))
      ) {
        /**
         * Instead of blocking the queue with these errors,
         * discard the (rest of the) transaction.
         *
         * Note that these errors typically indicate a bug in the application.
         * If protecting against data loss is important, save the failing records
         * elsewhere instead of discarding, and/or notify the user.
         */
        console.error("Data upload error - discarding:", lastOp, ex);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }
}

export const connector = new SupabaseConnector();