import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileVersionService {

  private apiServerUrl = 'http://localhost:8080/api/v1/'; 

  constructor(private http: HttpClient) { }

  createNewVersion(fileId: number, file: File, notes: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('notes', notes);

    return this.http.post<any>(`${this.apiServerUrl}/files/${fileId}/versions`, formData);
  }
}