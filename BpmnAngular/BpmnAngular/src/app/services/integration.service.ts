import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
;

const BASE_URL = "http://localhost:8080/api/v1";

@Injectable({
  providedIn: 'root'
})
export class IntegrationService {

  constructor(private http: HttpClient) { }

  // doLogin(request: LoginRequest):Observable<LoginResponse> {
  //   return this.http.post<LoginResponse>(BASE_URL + "/doLogin", request);
  // }

  // dashboard(): Observable<any> {
  //   return this.http.get<any>(BASE_URL + "/dashboard");
  // }

  // doRegister(request: SignupRequest):Observable<SignupResponse> {
  //   return this.http.post<SignupResponse>(BASE_URL + "/register", request);
  // }
}
