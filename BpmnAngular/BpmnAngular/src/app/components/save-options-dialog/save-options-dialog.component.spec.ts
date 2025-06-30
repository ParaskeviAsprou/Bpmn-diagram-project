import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SaveOptionsDialogComponent } from './save-options-dialog.component';



describe('SaveOptionsDialogComponent', () => {
  let component: SaveOptionsDialogComponent;
  let fixture: ComponentFixture<SaveOptionsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaveOptionsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SaveOptionsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
