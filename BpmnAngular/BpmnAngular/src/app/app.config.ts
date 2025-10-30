// 
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';

import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { authInterceptor } from './interceptors/auth.interceotir';

export const appConfig: ApplicationConfig = {
  providers: [
    // Router
    provideRouter(routes),
    
    // HTTP Client with interceptors
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    
    // Animations for Angular Material
    provideAnimations(),
    
    // Material Dialog and SnackBar modules
    importProvidersFrom(
      MatDialogModule,
      MatSnackBarModule
    ),
    
    // Translation module (LanguageService handles fetching JSON files)
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'en',
        useDefaultLang: true
      })
    )
  ]
};