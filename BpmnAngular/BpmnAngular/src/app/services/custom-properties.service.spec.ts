import { TestBed } from '@angular/core/testing';
import { CustomePropertyService } from './custom-properties.service';



describe('CustomPropertiesService', () => {
  let service: CustomePropertyService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CustomePropertyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
