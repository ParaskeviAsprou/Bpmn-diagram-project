import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { FolderSelectionDialogComponent } from './folder-selection-dialog.component';
import { FolderService } from '../../services/folder.service';

describe('FolderSelectionDialogComponent', () => {
  let component: FolderSelectionDialogComponent;
  let fixture: ComponentFixture<FolderSelectionDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<FolderSelectionDialogComponent>>;
  let mockFolderService: jasmine.SpyObj<FolderService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const folderServiceSpy = jasmine.createSpyObj('FolderService', ['getAllSimpleFolders']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [FolderSelectionDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: FolderService, useValue: folderServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FolderSelectionDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<FolderSelectionDialogComponent>>;
    mockFolderService = TestBed.inject(FolderService) as jasmine.SpyObj<FolderService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with root folder selected', () => {
    expect(component.selectedFolder).toEqual(component.rootFolder);
  });

  it('should load folders on init', () => {
    const mockFolders = [
      { id: 1, folderName: 'Test Folder 1', description: 'Test Description 1', createdTime: '2023-01-01', createdBy: 'user1' },
      { id: 2, folderName: 'Test Folder 2', description: 'Test Description 2', createdTime: '2023-01-02', createdBy: 'user2' }
    ];
    
    mockFolderService.getAllSimpleFolders.and.returnValue(of(mockFolders));
    
    component.ngOnInit();
    
    expect(mockFolderService.getAllSimpleFolders).toHaveBeenCalled();
    expect(component.folders).toEqual(mockFolders);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error loading folders', () => {
    const error = new Error('Failed to load folders');
    mockFolderService.getAllSimpleFolders.and.returnValue(throwError(() => error));
    
    component.ngOnInit();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('Error loading folders: Failed to load folders', 'Close', jasmine.any(Object));
    expect(component.isLoading).toBeFalse();
  });

  it('should select folder', () => {
    const folder = { id: 1, folderName: 'Test Folder', description: 'Test Description', createdTime: '2023-01-01', createdBy: 'user1' };
    component.selectFolder(folder);
    
    expect(component.selectedFolder).toBe(folder);
  });

  it('should select root folder', () => {
    component.selectRootFolder();
    
    expect(component.selectedFolder).toBe(component.rootFolder);
  });

  it('should confirm selection', () => {
    const folder = { id: 1, folderName: 'Test Folder', description: 'Test Description', createdTime: '2023-01-01', createdBy: 'user1' };
    component.selectedFolder = folder;
    component.onConfirm();
    
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      selectedFolder: folder,
      action: 'select'
    });
  });

  it('should cancel selection', () => {
    component.onCancel();
    
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      selectedFolder: null,
      action: 'cancel'
    });
  });

  it('should format date correctly', () => {
    const dateString = '2023-01-01T10:30:00Z';
    const formatted = component.formatDate(dateString);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('2023');
  });

  it('should get correct folder icon', () => {
    const rootFolder = { id: 0, folderName: 'Root', isRoot: true } as any;
    const regularFolder = { id: 1, folderName: 'Test', isRoot: false } as any;
    
    expect(component.getFolderIcon(rootFolder)).toBe('home');
    expect(component.getFolderIcon(regularFolder)).toBe('folder');
  });

  it('should get correct folder display name', () => {
    const rootFolder = { id: 0, folderName: 'Root', isRoot: true } as any;
    const regularFolder = { id: 1, folderName: 'Test Folder', isRoot: false } as any;
    
    expect(component.getFolderDisplayName(rootFolder)).toBe('Root Folder');
    expect(component.getFolderDisplayName(regularFolder)).toBe('Test Folder');
  });
});
