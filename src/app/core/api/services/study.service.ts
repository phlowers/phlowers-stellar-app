import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudyModel, ModifyStudyModel, SearchStudyModel } from '../models/study.model';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class StudyService {
  private apiUrl = `${environment.apiUrl}/api/v1/studies`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new study
   * @param study The study data to create
   * @returns The created StudyModel
   */
  createStudy(study: StudyModel): Observable<StudyModel> {
    return this.http.post<StudyModel>(`${this.apiUrl}/`, study);
  }

  /**
   * Retrieve a specific study by its UUID
   * @param studyUuid The UUID of the study to retrieve
   * @returns The requested StudyModel
   */
  getStudyByUuid(studyUuid: string): Observable<StudyModel> {
    return this.http.get<StudyModel>(`${this.apiUrl}/${studyUuid}`);
  }

  /**
   * Modify an existing study
   * @param studyUuid The UUID of the study to modify
   * @param studyData The updated study data
   * @returns The updated StudyModel
   */
  modifyStudy(studyUuid: string, studyData: ModifyStudyModel): Observable<StudyModel> {
    return this.http.put<StudyModel>(`${this.apiUrl}/${studyUuid}`, studyData);
  }

  /**
   * Delete a study by its UUID
   * @param studyUuid The UUID of the study to delete
   * @returns A response indicating success
   */
  deleteStudy(studyUuid: string): Observable<Record<string, number>> {
    return this.http.delete<Record<string, number>>(`${this.apiUrl}/${studyUuid}`);
  }

  /**
   * Search for studies based on criteria
   * @param searchCriteria The search parameters
   * @returns A list of matching StudyModel objects
   */
  searchStudies(searchCriteria: SearchStudyModel): Observable<StudyModel[]> {
    return this.http.post<StudyModel[]>(`${this.apiUrl}/search`, searchCriteria);
  }
} 