import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagramAccessManagmentComponent } from './diagram-access-managment.component';

describe('DiagramAccessManagmentComponent', () => {
  let component: DiagramAccessManagmentComponent;
  let fixture: ComponentFixture<DiagramAccessManagmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramAccessManagmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagramAccessManagmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
