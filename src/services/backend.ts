import type { BackendService } from "./types";
import supabaseService from "./backend.supabase";
const service: BackendService = supabaseService; // uses Flask shim underneath
export default service;
