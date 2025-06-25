import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnSaveDialogComponent } from './un-save-dialog.component';

describe('UnSaveDialogComponent', () => {
  let component: UnSaveDialogComponent;
  let fixture: ComponentFixture<UnSaveDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnSaveDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnSaveDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
