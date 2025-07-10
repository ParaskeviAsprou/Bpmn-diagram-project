import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiagramSharingComponent } from './diagram-sharing.component';

describe('DiagramSharingComponent', () => {
  let component: DiagramSharingComponent;
  let fixture: ComponentFixture<DiagramSharingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiagramSharingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DiagramSharingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
