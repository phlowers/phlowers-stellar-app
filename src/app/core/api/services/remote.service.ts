import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { timeout } from 'rxjs/operators';

const url = 'http://localhost:8080';

@Injectable({
  providedIn: 'root'
})
export class RemoteService {
  constructor(private httpClient: HttpClient) {}

  saveStudies = (studies: any) => {
    this.httpClient.post(`${url}/studies`, studies).subscribe({
      next: (res) => {
        console.log('Studies saved', res);
      },
      error: (err) => {
        console.log('Error saving studies');
      }
    });
  };
}
