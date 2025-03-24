import { StudyModel } from "../../api/models/study.model";

export type StudyModelLocal = StudyModel & {
  saved: boolean;
}
