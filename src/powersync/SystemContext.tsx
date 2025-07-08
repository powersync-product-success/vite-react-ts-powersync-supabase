import React from "react";
import type { SupabaseConnector } from "./SupabaseConnector";

// React Context for sharing Supabase connector across the app
// This provides access to authentication, PowerSync connection, and backend operations
export const SupabaseContext = React.createContext<SupabaseConnector | null>(null);

// Custom hook for easy access to Supabase connector in components
// Returns the connector instance or null if used outside provider
export const useSupabase = () => React.useContext(SupabaseContext);