import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Language {
  code: string;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'selectedLanguage';
  private readonly DEFAULT_LANGUAGE = 'en';
  
  private currentLanguageSubject = new BehaviorSubject<string>(this.DEFAULT_LANGUAGE);
  public currentLanguage$ = this.currentLanguageSubject.asObservable();

  public readonly availableLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' }
  ];

  constructor(private translate: TranslateService, private http: HttpClient) {
    console.log('LanguageService constructor called');
    this.initializeLanguage();
  }

  private initializeLanguage(): void {
    // Get saved language from localStorage or use default
    const savedLanguage = localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_LANGUAGE;
    console.log('Initializing language service with:', savedLanguage);
    
    // Set the language in translate service
    this.translate.setDefaultLang(this.DEFAULT_LANGUAGE);
    this.loadTranslations(savedLanguage);
    this.currentLanguageSubject.next(savedLanguage);
    console.log('Language service initialized, current language:', savedLanguage);
    
    // Keep subject/localStorage in sync when language changes
    this.translate.onLangChange.subscribe(event => {
      this.currentLanguageSubject.next(event.lang);
      localStorage.setItem(this.STORAGE_KEY, event.lang);
    });
  }

  private loadTranslations(languageCode: string): void {
    this.http.get(`assets/i18n/${languageCode}.json`).subscribe({
      next: (translations: any) => {
        this.translate.setTranslation(languageCode, translations, true);
        this.translate.use(languageCode);
        this.currentLanguageSubject.next(languageCode);
      },
      error: () => {
        // fallback to default
        if (languageCode !== this.DEFAULT_LANGUAGE) {
          this.loadTranslations(this.DEFAULT_LANGUAGE);
        }
      }
    });
  }

  public setLanguage(languageCode: string): void {
    console.log('LanguageService.setLanguage called with:', languageCode);
    if (this.isValidLanguage(languageCode)) {
      // Optimistically update UI and persist choice
      this.currentLanguageSubject.next(languageCode);
      localStorage.setItem(this.STORAGE_KEY, languageCode);
      this.loadTranslations(languageCode);
    } else {
      console.log('Invalid language code:', languageCode);
    }
  }

  public getCurrentLanguage(): string {
    return this.currentLanguageSubject.value;
  }

  public getAvailableLanguages(): Language[] {
    return this.availableLanguages;
  }

  public getLanguageByCode(code: string): Language | undefined {
    return this.availableLanguages.find(lang => lang.code === code);
  }

  public isRTL(): boolean {
    // Add RTL languages here if needed in the future
    return false;
  }

  private isValidLanguage(languageCode: string): boolean {
    return this.availableLanguages.some(lang => lang.code === languageCode);
  }

  public getTranslation(key: string, params?: any): Observable<string> {
    return this.translate.get(key, params);
  }

  public instant(key: string, params?: any): string {
    return this.translate.instant(key, params);
  }

  public onLangChange(): Observable<any> {
    return this.translate.onLangChange;
  }

  public refreshCurrentLanguage(): void {
    const currentLang = this.getCurrentLanguage();
    console.log('Refreshing current language:', currentLang);
    this.loadTranslations(currentLang);
  }
}
