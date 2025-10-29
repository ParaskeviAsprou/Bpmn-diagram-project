import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, Language } from '../../services/language.service';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, ClickOutsideDirective],
  template: `
    <div class="language-selector">
      <button 
        class="language-toggle"
        (click)="toggleDropdown()"
        [class.active]="isDropdownOpen">
        <span class="flag">{{ currentLanguage?.flag }}</span>
        <span class="language-name">{{ currentLanguage?.name }}</span>
        <i class="bx bx-chevron-down" [class.rotated]="isDropdownOpen"></i>
      </button>
      
      <div class="language-dropdown" *ngIf="isDropdownOpen" (clickOutside)="closeDropdown()">
        <div class="dropdown-header">
          <span>{{ 'common.language' | translate }}</span>
        </div>
        <div class="language-options">
          <button 
            *ngFor="let language of availableLanguages"
            class="language-option"
            [class.selected]="language.code === currentLanguageCode"
            (click)="selectLanguage(language.code)">
            <span class="flag">{{ language.flag }}</span>
            <span class="language-name">{{ language.name }}</span>
            <i class="bx bx-check" *ngIf="language.code === currentLanguageCode"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .language-selector {
      position: relative;
      display: inline-block;
    }

    .language-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 14px;
      min-width: 120px;
    }

    .language-toggle:hover {
      background: #f8f9fa;
      border-color: #007bff;
    }

    .language-toggle.active {
      background: #007bff;
      color: white;
      border-color: #007bff;
    }

    .flag {
      font-size: 16px;
    }

    .language-name {
      flex: 1;
      text-align: left;
    }

    .bx-chevron-down {
      transition: transform 0.2s ease;
    }

    .bx-chevron-down.rotated {
      transform: rotate(180deg);
    }

    .language-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #ddd;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      margin-top: 4px;
      overflow: hidden;
    }

    .dropdown-header {
      padding: 12px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #eee;
      font-weight: 600;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .language-options {
      max-height: 200px;
      overflow-y: auto;
    }

    .language-option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      width: 100%;
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.2s ease;
      font-size: 14px;
      text-align: left;
    }

    .language-option:hover {
      background: #f8f9fa;
    }

    .language-option.selected {
      background: #e3f2fd;
      color: #1976d2;
    }

    .language-option .flag {
      font-size: 16px;
    }

    .language-option .language-name {
      flex: 1;
    }

    .language-option .bx-check {
      color: #1976d2;
      font-size: 16px;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
      .language-toggle {
        min-width: 100px;
        padding: 6px 10px;
        font-size: 13px;
      }
      
      .language-dropdown {
        right: 0;
        left: auto;
        min-width: 150px;
      }
    }
  `]
})
export class LanguageSelectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isDropdownOpen = false;
  currentLanguageCode = '';
  currentLanguage: Language | null = null;
  availableLanguages: Language[] = [];

  constructor(private languageService: LanguageService) {}

  ngOnInit(): void {
    console.log('LanguageSelectorComponent initialized');
    
    // Get initial language state
    this.currentLanguageCode = this.languageService.getCurrentLanguage();
    this.currentLanguage = this.languageService.getLanguageByCode(this.currentLanguageCode) || null;
    console.log('Initial language:', this.currentLanguageCode, this.currentLanguage);
    
    // Subscribe to current language changes
    this.languageService.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe(languageCode => {
        console.log('Language changed to:', languageCode);
        this.currentLanguageCode = languageCode;
        this.currentLanguage = this.languageService.getLanguageByCode(languageCode) || null;
        console.log('Component updated with language:', this.currentLanguage);
      });

    // Get available languages
    this.availableLanguages = this.languageService.getAvailableLanguages();
    console.log('Available languages:', this.availableLanguages);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleDropdown(): void {
    console.log('Toggle dropdown clicked, current state:', this.isDropdownOpen);
    this.isDropdownOpen = !this.isDropdownOpen;
    console.log('New dropdown state:', this.isDropdownOpen);
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  selectLanguage(languageCode: string): void {
    console.log('Selecting language:', languageCode);
    console.log('Current language before change:', this.currentLanguageCode);
    this.languageService.setLanguage(languageCode);
    this.closeDropdown();
    
    // Force a check after a short delay
    setTimeout(() => {
      console.log('Language after change:', this.languageService.getCurrentLanguage());
      console.log('Component current language:', this.currentLanguageCode);
    }, 100);
  }
}
