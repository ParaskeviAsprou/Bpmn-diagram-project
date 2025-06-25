import { TestBed } from '@angular/core/testing';

import { CustomPropertiesService } from './services/custom-properties.service';

describe('CustomPropertiesService', () => {
  let service: CustomPropertiesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomPropertiesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
