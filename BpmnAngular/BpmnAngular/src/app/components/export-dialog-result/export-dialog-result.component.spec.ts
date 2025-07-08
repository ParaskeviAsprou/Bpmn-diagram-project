import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportDialogResultComponent } from './export-dialog-result.component';

describe('ExportDialogResultComponent', () => {
  let component: ExportDialogResultComponent;
  let fixture: ComponentFixture<ExportDialogResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportDialogResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportDialogResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
