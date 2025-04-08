/**
 * Copyright (c) 2025, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ModifySectionModel, SearchSectionModel, SectionModel } from '../models/section.model';

@Injectable({
  providedIn: 'root'
})
export class SectionService {
  private apiUrl = `${environment.apiUrl}/api/v1/sections`;

  constructor(private http: HttpClient) {}

  /**
   * Create a new section
   * @param section The section data to create
   * @returns The created SectionModel
   */
  createSection(section: SectionModel): Observable<SectionModel> {
    return this.http.post<SectionModel>(`${this.apiUrl}/`, section);
  }

  /**
   * Retrieve a specific section by its UUID
   * @param sectionUuid The UUID of the section to retrieve
   * @returns The requested SectionModel
   */
  getSectionByUuid(sectionUuid: string): Observable<SectionModel> {
    return this.http.get<SectionModel>(`${this.apiUrl}/${sectionUuid}`);
  }

  /**
   * Modify an existing section
   * @param sectionUuid The UUID of the section to modify
   * @param sectionData The updated section data
   * @returns The updated SectionModel
   */
  modifySection(sectionUuid: string, sectionData: ModifySectionModel): Observable<SectionModel> {
    return this.http.put<SectionModel>(`${this.apiUrl}/${sectionUuid}`, sectionData);
  }

  /**
   * Delete a section by its UUID
   * @param sectionUuid The UUID of the section to delete
   * @returns A response indicating success
   */
  deleteSection(sectionUuid: string): Observable<Record<string, number>> {
    return this.http.delete<Record<string, number>>(`${this.apiUrl}/${sectionUuid}`);
  }

  /**
   * Search for studies based on criteria
   * @param searchCriteria The search parameters
   * @returns A list of matching StudyModel objects
   */
  searchSections(searchCriteria: SearchSectionModel): Observable<SectionModel[]> {
    return this.http.post<SectionModel[]>(`${this.apiUrl}/search`, searchCriteria);
  }
}
