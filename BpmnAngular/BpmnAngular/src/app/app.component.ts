import { Component, ViewChild, OnInit, EventEmitter, Output, viewChild } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { BpmnModelerComponent } from './components/bpmn-modeler/bpmn-modeler.component';
import { LocalStorageService } from './services/local-storage.service';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AuthenticationService } from './services/authentication.service';
import { filter } from 'rxjs';

interface DashboardCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  action: () => void;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  @ViewChild(BpmnModelerComponent) bpmnModeler!: BpmnModelerComponent;

  @Output() searchEvent = new EventEmitter<string>();

  isLoggedIn = true;
  searchOptions: FormGroup;
  showSearchResults = false;
  showGlobalResults = false;
  globalSearchResults: any[] = [];
  searchResults: string[] = [];
  allCards: DashboardCard[] = [];
  filteredCards: DashboardCard[] = [];

  constructor(
    private router: Router,
    private storage: LocalStorageService,
    private authenticationService: AuthenticationService,
    private fb: FormBuilder,
  ) {
    this.searchOptions = this.fb.group({
      searchTerm: ['']
    });

  }

  searchableCards = [
    {
      id: 'modeler',
      title: 'BPMN Modeler',
      description: 'Create and edit BPMN diagrams',
      icon: 'bx bx-edit',
      route: '/modeler',
      action: () => this.router.navigateByUrl('/modeler')
    },
    {
      id: 'files',
      title: 'Recent Files',
      description: 'Access your recent projects',
      icon: 'bx bx-folder-open',
      route: '/list',
      action: () => this.router.navigateByUrl('/list')
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure your preferences',
      icon: 'bx bx-cog',
      route: '/settings',
      action: () => this.router.navigateByUrl('/settings')
    }
  ];
  ngOnInit(): void {
    this.allCards = [...this.searchableCards];
    this.filteredCards = [...this.allCards];
    this.checkAuthStatus();

    this.router.events
    .pipe(filter(event=> event instanceof NavigationEnd))
    .subscribe(() =>{
      this.checkAuthStatus();
    })
  }

  onGlobalSearch(event: any): void {
    const searchTerm = event.target.value?.toLowerCase().trim();

    if (!searchTerm) {
      this.showGlobalResults = false;
      this.globalSearchResults = [];
      return;
    }

    this.globalSearchResults = this.searchableCards.filter(card =>
      card.title.toLowerCase().includes(searchTerm) ||
      card.description.toLowerCase().includes(searchTerm)
    );

    this.showGlobalResults = this.globalSearchResults.length > 0;
  }

  navigateToCard(card: any): void {
    this.router.navigateByUrl(card.route);
    this.showGlobalResults = false;
    this.searchOptions.patchValue({ searchTerm: '' });
  }

  onSearchSubmit(): void {
    const searchTerm = this.searchOptions.get('searchTerm')?.value;
    if (searchTerm) {
      this.router.navigate(['/dashboard'], { queryParams: { search: searchTerm } });
    }
  }


  private checkAuthStatus(): void {
    const token = this.storage.get('token');
    this.isLoggedIn = !!token;

    const currentUrl = this.router.url;
    if (currentUrl === '/login' || currentUrl === '/register' || currentUrl === '/') {
      this.isLoggedIn = false;
    }
  }

  openFile(event: Event): void {
    if (this.bpmnModeler) {
      this.bpmnModeler.onFileChange(event);
    }
  }

  exportXml(): void {
    if (this.bpmnModeler) {
      this.bpmnModeler.saveDiagram();
    }
  }

  logout(): void {
    this.storage.remove('token');
    this.isLoggedIn = false;
    this.router.navigateByUrl('/login');
  }
onSearchInput(): void {
  const searchTerm = this.searchOptions.get('searchTerm')?.value?.toLowerCase().trim();
  if (!searchTerm) {
    this.searchResults = [];
    this.showSearchResults = false;
    return;
  }
  this.searchResults = this.allCards
    .filter(card =>
      card.title.toLowerCase().includes(searchTerm) ||
      card.description.toLowerCase().includes(searchTerm)
    )
    .map(card => card.title);
  this.showSearchResults = this.searchResults.length > 0;
}
  clearSearch(): void {
    this.searchOptions.patchValue({ searchTerm: '' });
    this.filteredCards = [...this.allCards];
    this.searchResults = [];
    this.showSearchResults = false;
  }

  selectSearchResult(title: string): void {
    const card = this.allCards.find(c => c.title === title);
    if (card) {
      this.searchOptions.patchValue({ searchTerm: title });
      this.filteredCards = [card];
      this.showSearchResults = false;
    }
  }
}
