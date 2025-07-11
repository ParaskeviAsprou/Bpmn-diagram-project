import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagramAcessManagmentComponent } from './diagram-acess-managment.component';

describe('DiagramAcessManagmentComponent', () => {
  let component: DiagramAcessManagmentComponent;
  let fixture: ComponentFixture<DiagramAcessManagmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramAcessManagmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagramAcessManagmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
