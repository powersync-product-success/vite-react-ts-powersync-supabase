import { column, Schema, Table } from "@powersync/web";

export const COUNTER_TABLE = "counters";

// Define table structure with PowerSync column types
// Each column maps to SQLite types and handles sync operations
const counters = new Table({
    owner_id: column.text,    // String field for identifying record owner
    count: column.integer,    // Number field for counter value
    created_at: column.text, // Timestamp for record creation
});

// Create the database schema - PowerSync uses this for sync rules and local storage
// Add all the tables that you want your client to sync here
export const AppSchema = new Schema({
    counters,
});

// Generate TypeScript types from schema for type-safe database operations
export type Database = (typeof AppSchema)["types"];
export type CounterRecord = Database["counters"];