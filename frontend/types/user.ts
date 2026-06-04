export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  diploma?: string;
  domain?: string;
  years_experience?: string;
  skills: string[];
  is_active?: boolean;
  created_at: string;
}
