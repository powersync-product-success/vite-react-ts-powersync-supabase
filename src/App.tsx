import "./App.css";
import { useQuery, useStatus } from "@powersync/react";
import { COUNTER_TABLE, type CounterRecord } from "./powersync/AppSchema";
import { useEffect, useState } from "react";
import { useSupabase } from "./powersync/SystemContext";
import { powerSync } from "./powersync/System.ts";
import { connector } from "./powersync/SupabaseConnector";

function App() {
  const supabase = useSupabase();
  const [userID, setUserID] = useState<string | null>(null);
  const status = useStatus();

  // Example of a watch query using useQuery hook
  // This demonstrates how to fetch and automatically update data when the underlying table changes
  const { data: counters, isLoading } = useQuery<CounterRecord>(
    `SELECT * FROM ${COUNTER_TABLE} ORDER BY created_at ASC`
  );

  // Effect hook to fetch and set the current user's ID from Supabase auth session
  // Runs once when the component mounts or when supabase instance changes
  useEffect(() => {
    fetchUserID();
  }, [supabase]);

  const fetchUserID = async () => {
    // Get the current authentication session from Supabase
    // const session = await supabase?.client.auth.getSession();
    // const userId = session?.data.session?.user?.id;
    // if (userId) setUserID(userId);
    // else console.error("No user ID found in session");
    await connector.signInAnonymously();
    const session = connector.currentSession;

    console.log("Current session", session);
    const userId = session?.user?.id;
    if (userId) {
      setUserID(userId);
    }
    else {
      console.error("No user ID found in session");
    }
  };

  // Example of executing a native SQLite query using PowerSync
  // This demonstrates how to directly execute SQL commands for data mutations
  const updateCounter = async (counter: CounterRecord, newCount: number) => {
    return powerSync.execute(
      `UPDATE ${COUNTER_TABLE} SET count = ? WHERE owner_id = ?`,
      [newCount, counter.owner_id]
    );
  };

  // Function to create a new counter record for the current user
  // Uses native SQLite execution through PowerSync for data insertion
  const createCounter = async () => {
    // Ensure user is authenticated before creating counter
    if (!userID) {
      await fetchUserID();
    }
    try {
      // Insert new counter with generated UUID, current user ID, and initial count of 0
      await powerSync.execute(
        `INSERT INTO ${COUNTER_TABLE} (id, owner_id, count, created_at) VALUES (uuid(), ?, ?, ?)`,
        [userID, 0, new Date().toISOString()]
      );
    } catch (err) {
      console.error("Error creating counter:", err);
    }
  };

  return (
    <div className="app-container">
      <div className="status-card">
        <h3>PowerSync Status</h3>
        <div className="mono-text">
          {/* SDK version of the rust core extension and it's hash - see here https://github.com/powersync-ja/powersync-sqlite-core/releases */}
          <div><strong>SDK Version:</strong> {powerSync.sdkVersion}</div>
          {status && (
            <>
              <div><strong>connected:</strong> {status.connected.toString()}</div>
              <div><strong>connecting:</strong> {status.connecting.toString()}</div>
              <div><strong>uploading:</strong> {status.dataFlowStatus?.uploading?.toString()}</div>
              <div><strong>downloading:</strong> {status.dataFlowStatus?.downloading?.toString()}</div>
              <div>
                <strong>downloadProgress:</strong>{" "}
                {status.downloadProgress?.downloadedFraction != null
                  ? `${(status.downloadProgress.downloadedFraction * 100).toFixed(2)}%`
                  : "0%"}
              </div>
              <div><strong>hasSynced:</strong> {status.hasSynced?.toString() ?? "false"}</div>
              <div><strong>lastSyncedAt:</strong> {status.lastSyncedAt?.toLocaleString() ?? "N/A"}</div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <>
          {/* Only visible if the current user has not created a counter */}
          {!counters.some((c) => c.owner_id === userID) && (
            <div className="centered">
              <button onClick={createCounter} className="primary-button">
                Create Counter
              </button>
            </div>
          )}

          <div className="counter-grid">
            {counters.map((counter) => (
              <div key={counter.owner_id} className="counter-card">
                <p>Counter for Id: {counter.owner_id}</p>
                <p className="counter-count">Count: {counter.count}</p>
                <p className="counter-date">
                  Created at: <strong>{new Date(counter.created_at ?? '').toLocaleString()}</strong>
                </p>
                <button
                  onClick={() => updateCounter(counter, (counter.count ?? 0) + 1)}
                  className="primary-button"
                >
                  Increment
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
