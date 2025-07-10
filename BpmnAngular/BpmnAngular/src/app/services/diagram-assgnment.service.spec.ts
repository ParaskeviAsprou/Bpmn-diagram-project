import { TestBed } from '@angular/core/testing';

import { DiagramAssgnmentService } from './services/diagram-assgnment.service';

describe('DiagramAssgnmentService', () => {
  let service: DiagramAssgnmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiagramAssgnmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
