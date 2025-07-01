import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VersionHistoryDialogComponent } from './version-history-dialog.component';

describe('VersionHistoryDialogComponent', () => {
  let component: VersionHistoryDialogComponent;
  let fixture: ComponentFixture<VersionHistoryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionHistoryDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VersionHistoryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
