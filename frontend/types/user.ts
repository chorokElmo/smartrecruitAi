export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  diploma?: string;
  skills: string[];
  is_active: boolean;
  created_at: string;
}
