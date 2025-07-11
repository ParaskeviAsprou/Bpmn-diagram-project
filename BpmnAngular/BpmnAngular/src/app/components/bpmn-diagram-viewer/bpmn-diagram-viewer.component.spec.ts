import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BpmnDiagramViewerComponent } from './bpmn-diagram-viewer.component';

describe('BpmnDiagramViewerComponent', () => {
  let component: BpmnDiagramViewerComponent;
  let fixture: ComponentFixture<BpmnDiagramViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BpmnDiagramViewerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BpmnDiagramViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
