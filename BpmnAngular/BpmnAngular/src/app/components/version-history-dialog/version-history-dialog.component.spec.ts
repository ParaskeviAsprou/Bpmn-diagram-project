import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';

import { VersionHistoryDialogComponent } from './version-history-dialog.component';
import { FileVersionService } from '../../services/file-version.service';

describe('VersionHistoryDialogComponent', () => {
  let component: VersionHistoryDialogComponent;
  let fixture: ComponentFixture<VersionHistoryDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<VersionHistoryDialogComponent>>;
  let mockFileVersionService: jasmine.SpyObj<FileVersionService>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    const fileVersionServiceSpy = jasmine.createSpyObj('FileVersionService', ['getFileVersions']);
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

    await TestBed.configureTestingModule({
      imports: [VersionHistoryDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { fileId: 1, fileName: 'Test File' } },
        { provide: FileVersionService, useValue: fileVersionServiceSpy },
        { provide: MatSnackBar, useValue: snackBarSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VersionHistoryDialogComponent);
    component = fixture.componentInstance;
    mockDialogRef = TestBed.inject(MatDialogRef) as jasmine.SpyObj<MatDialogRef<VersionHistoryDialogComponent>>;
    mockFileVersionService = TestBed.inject(FileVersionService) as jasmine.SpyObj<FileVersionService>;
    mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load version history on init', () => {
    const mockVersions = [
      { id: 1, version: 1, fileName: 'test.bpmn', fileSize: 1024, createdTime: '2023-01-01', createdBy: 'user1', isCurrent: true },
      { id: 2, version: 2, fileName: 'test.bpmn', fileSize: 2048, createdTime: '2023-01-02', createdBy: 'user2', isCurrent: false }
    ];
    
    mockFileVersionService.getFileVersions.and.returnValue(of(mockVersions));
    
    component.ngOnInit();
    
    expect(mockFileVersionService.getFileVersions).toHaveBeenCalledWith(1);
    expect(component.versions.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should handle error loading version history', () => {
    const error = new Error('Failed to load versions');
    mockFileVersionService.getFileVersions.and.returnValue(throwError(() => error));
    
    component.ngOnInit();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('Error loading version history: Failed to load versions', 'Close', jasmine.any(Object));
    expect(component.isLoading).toBeFalse();
  });

  it('should select version', () => {
    const version = { id: 1, version: 1, fileName: 'test.bpmn', fileSize: 1024, createdTime: '2023-01-01', createdBy: 'user1', isCurrent: true };
    component.selectVersion(version);
    
    expect(component.selectedVersion).toBe(version);
  });

  it('should format file size correctly', () => {
    expect(component.formatFileSize(0)).toBe('0 Bytes');
    expect(component.formatFileSize(1024)).toBe('1 KB');
    expect(component.formatFileSize(1048576)).toBe('1 MB');
  });

  it('should format date correctly', () => {
    const dateString = '2023-01-01T10:30:00Z';
    const formatted = component.formatDate(dateString);
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('2023');
  });

  it('should get correct version badge class', () => {
    const currentVersion = { id: 1, version: 1, fileName: 'test.bpmn', fileSize: 1024, createdTime: '2023-01-01', createdBy: 'user1', isCurrent: true };
    const previousVersion = { id: 2, version: 2, fileName: 'test.bpmn', fileSize: 2048, createdTime: '2023-01-02', createdBy: 'user2', isCurrent: false };
    
    expect(component.getVersionBadgeClass(currentVersion)).toBe('version-badge current');
    expect(component.getVersionBadgeClass(previousVersion)).toBe('version-badge');
  });

  it('should get correct version icon', () => {
    const currentVersion = { id: 1, version: 1, fileName: 'test.bpmn', fileSize: 1024, createdTime: '2023-01-01', createdBy: 'user1', isCurrent: true };
    const previousVersion = { id: 2, version: 2, fileName: 'test.bpmn', fileSize: 2048, createdTime: '2023-01-02', createdBy: 'user2', isCurrent: false };
    
    expect(component.getVersionIcon(currentVersion)).toBe('star');
    expect(component.getVersionIcon(previousVersion)).toBe('history');
  });

  it('should show warning when trying to download without selection', () => {
    component.selectedVersion = null;
    component.onDownloadVersion();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('Please select a version to download', 'Close', jasmine.any(Object));
  });

  it('should show warning when trying to restore without selection', () => {
    component.selectedVersion = null;
    component.onRestoreVersion();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('Please select a version to restore', 'Close', jasmine.any(Object));
  });

  it('should show info when trying to restore current version', () => {
    const currentVersion = { id: 1, version: 1, fileName: 'test.bpmn', fileSize: 1024, createdTime: '2023-01-01', createdBy: 'user1', isCurrent: true };
    component.selectedVersion = currentVersion;
    component.onRestoreVersion();
    
    expect(mockSnackBar.open).toHaveBeenCalledWith('This is already the current version', 'Close', jasmine.any(Object));
  });

  it('should close dialog with restore action', () => {
    const version = { id: 2, version: 2, fileName: 'test.bpmn', fileSize: 2048, createdTime: '2023-01-02', createdBy: 'user2', isCurrent: false };
    component.selectedVersion = version;
    component.onRestoreVersion();
    
    expect(mockDialogRef.close).toHaveBeenCalledWith({
      selectedVersion: version,
      action: 'restore'
    });
  });

  it('should close dialog', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});