export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  description: string;
  required_skills: string[];
  required_diploma?: string;
  required_experience?: string;
  contract_type?: string;
  deadline?: string;
  source_url?: string;
  source_name?: string;
  sector?: string;
  created_at: string;
}

export interface Recommendation {
  id: string;
  job: Job;
  score: number;
  skill_score: number;
  title_score: number;
  experience_score: number;
  semantic_score: number;
  keyword_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: string;
  generated_at: string;
}

/** Live match result — comes directly from Moroccan websites, not the DB */
export interface LiveMatch {
  title:               string;
  company:             string;
  location:            string;
  description:         string;
  source_name:         string;
  source_url:          string;
  sector:              string;
  contract_type?:      string;
  deadline?:           string;    // ISO date — application deadline
  remote_work?:        boolean;
  soft_skills?:        string[];
  score:               number;    // 0–100
  explanation:         string;
  matching_skills:     string[];
  missing_skills:      string[];
  required_diploma?:   string;
  required_experience?:string;
}
