import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileConflictDialogComponent } from './file-conflict-dialog.component';

describe('FileConflictDialogComponent', () => {
  let component: FileConflictDialogComponent;
  let fixture: ComponentFixture<FileConflictDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileConflictDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileConflictDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
