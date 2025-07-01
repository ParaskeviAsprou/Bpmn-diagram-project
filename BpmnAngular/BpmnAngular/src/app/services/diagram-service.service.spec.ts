import { TestBed } from '@angular/core/testing';

import { DiagramServiceService } from './diagram-service.service';

describe('DiagramServiceService', () => {
  let service: DiagramServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DiagramServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
