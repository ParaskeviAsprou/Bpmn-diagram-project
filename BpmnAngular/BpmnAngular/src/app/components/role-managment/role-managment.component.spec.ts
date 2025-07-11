import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleManagmentComponent } from './role-managment.component';

describe('RoleManagmentComponent', () => {
  let component: RoleManagmentComponent;
  let fixture: ComponentFixture<RoleManagmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleManagmentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleManagmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
