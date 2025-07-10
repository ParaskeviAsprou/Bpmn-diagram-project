import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyDiagramsComponent } from './my-diagrams.component';

describe('MyDiagramsComponent', () => {
  let component: MyDiagramsComponent;
  let fixture: ComponentFixture<MyDiagramsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyDiagramsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyDiagramsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
