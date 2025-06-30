import { TestBed } from '@angular/core/testing';

import { FileManagemnetService } from './services/file-managemnet.service';

describe('FileManagemnetService', () => {
  let service: FileManagemnetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileManagemnetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
