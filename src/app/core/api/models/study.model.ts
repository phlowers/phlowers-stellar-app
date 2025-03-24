export interface StudyModel {
  uuid: string;
  author_email: string;
  title: string;
  description?: string;
  created_at_offline: string;
  updated_at_offline: string;
}

export interface ModifyStudyModel {
  author_email?: string | null;
  title?: string | null;
  description?: string | null;
  created_at_offline?: string | null;
  updated_at_offline?: string | null;
}

export interface SearchStudyModel {
  uuid?: string | null;
  author_email?: string | null;
  title?: string | null;
  description?: string | null;
  created_after?: string | null;
  created_before?: string | null;
} 