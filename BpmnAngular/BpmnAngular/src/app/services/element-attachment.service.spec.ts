import { TestBed } from '@angular/core/testing';
import { ElementAttachmentService } from './element-attachment.service';



describe('ElementAttachmentService', () => {
  let service: ElementAttachmentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElementAttachmentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
