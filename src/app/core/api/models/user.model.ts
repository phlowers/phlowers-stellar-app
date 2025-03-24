import { StudyModel } from './study.model';

export interface UserModel {
  id?: string;
  email: string;
  studies?: StudyModel[];
}   