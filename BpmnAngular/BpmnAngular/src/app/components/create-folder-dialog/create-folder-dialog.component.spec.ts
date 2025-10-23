import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { CreateFolderDialogComponent } from './create-folder-dialog.component';
import { FolderService } from '../../services/folder.service';
import { AuthenticationService } from '../../services/authentication.service';

describe('CreateFolderDialogComponent', () => {
  let component: CreateFolderDialogComponent;
  let fixture: ComponentFixture<CreateFolderDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<CreateFolderDialogComponent>>;
  let mockFolderService: jasmine.SpyObj<FolderService>;
  let mockAuthService: jasmine.SpyObj<AuthenticationService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const folderServiceSpy = jasmine.createSpyObj('FolderService', ['createFolder']);
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['getCurrentUser']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [CreateFolderDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} },
        { provide: FolderService, useValue: folderServiceSpy },
        { provide: AuthenticationService, useValue: authServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateFolderDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<CreateFolderDialogComponent>>;
    mockFolderService = TestBed.inject(FolderService) as jasmine.SpyObj<FolderService>;
    mockAuthService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty values', () => {
    expect(component.folderName).toBe('');
    expect(component.description).toBe('');
    expect(component.isCreating).toBeFalse();
  });

  it('should initialize with provided data', () => {
    component.data = {
      folderName: 'Test Folder',
      description: 'Test Description'
    };
    component.ngOnInit();
    
    expect(component.folderName).toBe('Test Folder');
    expect(component.description).toBe('Test Description');
  });

  it('should validate folder name', () => {
    component.folderName = '';
    expect(component.isFolderNameValid()).toBeFalse();
    
    component.folderName = 'a';
    expect(component.isFolderNameValid()).toBeFalse();
    
    component.folderName = 'ab';
    expect(component.isFolderNameValid()).toBeTrue();
  });

  it('should show error for empty folder name', () => {
    component.folderName = '';
    expect(component.getFolderNameError()).toBe('Folder name is required');
  });

  it('should show error for short folder name', () => {
    component.folderName = 'a';
    expect(component.getFolderNameError()).toBe('Folder name must be at least 2 characters long');
  });

  it('should not show error for valid folder name', () => {
    component.folderName = 'Valid Folder';
    expect(component.getFolderNameError()).toBe('');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith({ success: false });
  });

  it('should create folder successfully', () => {
    const mockFolder = { id: 1, folderName: 'Test Folder', description: 'Test Description' };
    const mockUser = { username: 'testuser' };
    
    mockAuthService.getCurrentUser.and.returnValue(mockUser);
    mockFolderService.createFolder.and.returnValue(of(mockFolder));
    
    component.folderName = 'Test Folder';
    component.description = 'Test Description';
    component.onCreateFolder();
    
    expect(mockFolderService.createFolder).toHaveBeenCalledWith('Test Folder', 'Test Description', 'testuser');
    expect(mockDialogRef.close).toHaveBeenCalledWith({ success: true, folder: mockFolder });
  });

  it('should handle folder creation error', () => {
    const mockUser = { username: 'testuser' };
    const error = new Error('Creation failed');
    
    mockAuthService.getCurrentUser.and.returnValue(mockUser);
    mockFolderService.createFolder.and.returnValue(throwError(() => error));
    
    component.folderName = 'Test Folder';
    component.onCreateFolder();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('Error creating folder: Creation failed', 'Close', jasmine.any(Object));
    expect(component.isCreating).toBeFalse();
  });

  it('should not create folder with empty name', () => {
    component.folderName = '';
    component.onCreateFolder();
    
    expect(mockFolderService.createFolder).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Folder name is required', 'Close', jasmine.any(Object));
  });

  it('should not create folder with short name', () => {
    component.folderName = 'a';
    component.onCreateFolder();
    
    expect(mockFolderService.createFolder).not.toHaveBeenCalled();
    expect(mockSnackBar.open).toHaveBeenCalledWith('Folder name must be at least 2 characters long', 'Close', jasmine.any(Object));
  });
});