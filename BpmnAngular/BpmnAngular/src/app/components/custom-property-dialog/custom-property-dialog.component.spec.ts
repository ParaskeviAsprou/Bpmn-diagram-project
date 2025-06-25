import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomPropertyDialogComponent } from './custom-property-dialog.component';

describe('CustomPropertyDialogComponent', () => {
  let component: CustomPropertyDialogComponent;
  let fixture: ComponentFixture<CustomPropertyDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomPropertyDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomPropertyDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
