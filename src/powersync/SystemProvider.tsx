import { PowerSyncContext } from "@powersync/react";
import React, { Suspense } from "react";
import { powerSync } from "./System.ts";
import { SupabaseContext } from "./SystemContext";
import { connector } from "./SupabaseConnector";

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PowerSyncContext.Provider value={powerSync}>
        <SupabaseContext.Provider value={connector}>
          {children}
        </SupabaseContext.Provider>
      </PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
