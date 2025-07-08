import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FileOverwriteDialogComponent } from './file-overwrite-dialog.component';

describe('FileOverwriteDialogComponent', () => {
  let component: FileOverwriteDialogComponent;
  let fixture: ComponentFixture<FileOverwriteDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileOverwriteDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FileOverwriteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
