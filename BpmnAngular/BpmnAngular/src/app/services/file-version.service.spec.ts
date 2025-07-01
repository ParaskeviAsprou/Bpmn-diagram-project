import { TestBed } from '@angular/core/testing';

import { FileVersionService } from './services/file-version.service';

describe('FileVersionService', () => {
  let service: FileVersionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileVersionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
