import { createFlaskClient } from './localFlaskClient';
export const api = createFlaskClient(import.meta.env.VITE_FLASK_URL || 'http://localhost:5000');
