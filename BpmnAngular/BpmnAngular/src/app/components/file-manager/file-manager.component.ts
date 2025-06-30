import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { FileManagementService, FileModel, FolderModel, SearchResults } from '../../services/file-managemnet.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FileTreeComponent } from '../../file-tree/file-tree.component';
import { MatDividerModule } from '@angular/material/divider';
import {MatBadgeModule} from '@angular/material/badge';
import { ListFilesComponent } from '../list-files/list-files.component';
@Component({
  selector: 'app-file-manager',
  standalone: true,
  imports: [CommonModule,
    FormsModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatBadgeModule,
    MatProgressBarModule,
    FileTreeComponent,
    ListFilesComponent, MatDividerModule],
  templateUrl: './file-manager.component.html',
  styleUrl: './file-manager.component.css'
})
export class FileManagerComponent implements OnInit {

  currentView: 'tree' | 'list' | 'split' = 'split';
  sidebarOpen = true;
  loading = false;
  searchTimeout: any;
  searchQuery = '';
  showSearchResults = false;

  searchResults: SearchResults | null = null;
  currentFolder: FolderModel | null = null;

  // Statistics
  totalFiles = 0;
  totalSize = 0;
  bpmnFiles = 0;
  recentCount = 0;
  templateCount = 0;
  publicCount = 0;

  constructor(private fileServiceManagement: FileManagementService) { }

  ngOnInit(): void {
    this.loadStatistics();

  }

  private loadStatistics() {
    this.fileServiceManagement.getAllFiles().subscribe(files => {
      this.totalFiles = files.length;
      this.totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
      this.bpmnFiles = files.filter(file => this.isBpmnFile(file)).length;
      this.templateCount = files.filter(file => file.isTemplate).length;
      this.publicCount = files.filter(file => file.isPublic).length;
    });
  }
  
  private isBpmnFile(file : FileModel){
     return file.fileName.endsWith('.bpmn') || file.fileName.endsWith('.pdf') ||
           file.fileName.endsWith('.xml') || file.fileName.endsWith('.svg') ||
           file.fileType?.includes('xml');
  }

   toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
   
 onSearchInput() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      if (this.searchQuery.trim()) {
        this.search();
      } else {
        this.clearSearch();
      }
    }, 500);
  }

  search() {
    if (!this.searchQuery.trim()) return;

    this.loading = true;
    this.fileServiceManagement.searchFiles(this.searchQuery).subscribe(results => {
      this.searchResults = results;
      this.showSearchResults = true;
      this.loading = false;
    });
  }

  clearSearch() {
    this.searchQuery = '';
    this.showSearchResults = false;
    this.searchResults = null;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

   onViewChange() {
    console.log('View changed to:', this.currentView);
  }

 // Navigation
  navigateToRecent() {
    console.log('Navigate to recent files');
  }

  navigateToTemplates() {
    console.log('Navigate to templates');
  }

  navigateToPublic() {
    console.log('Navigate to public files');
  }

  navigateToShared() {
    console.log('Navigate to shared files');
  }

  // Actions
  uploadFiles() {
    console.log('Open upload dialog');
  }

  createFolder() {
    console.log('Open create folder dialog');
  }

  refreshAll() {
    this.loadStatistics();
    // Trigger refresh in child components
  }

  toggleSettings() {
    console.log('Toggle settings');
  }
}
