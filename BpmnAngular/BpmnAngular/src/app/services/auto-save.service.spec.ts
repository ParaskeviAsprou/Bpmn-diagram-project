import { TestBed } from '@angular/core/testing';

import { AutoSaveService } from './services/auto-save.service';

describe('AutoSaveService', () => {
  let service: AutoSaveService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoSaveService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
