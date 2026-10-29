import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export type ReaderAuth = { user: User | null; loading: boolean; recovery: boolean };
export const AuthContext = createContext<ReaderAuth>({ user: null, loading: true, recovery: false });
export const useReaderAuth = () => useContext(AuthContext);