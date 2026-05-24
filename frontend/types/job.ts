export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  required_skills: string[];
  contract_type?: string;
  deadline?: string;
  source_url?: string;
  source_name?: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  job: Job;
  score: number;
  matching_skills: string[];
  missing_skills: string[];
  generated_at: string;
}
