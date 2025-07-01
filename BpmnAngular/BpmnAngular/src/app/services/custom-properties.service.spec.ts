import { TestBed } from '@angular/core/testing';
import { CustomPropertyService } from './custom-properties.service';




describe('CustomPropertiesService', () => {
  let service: CustomPropertyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomPropertyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
