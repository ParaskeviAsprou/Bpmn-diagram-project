import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoleTreeNodeComponent } from './role-tree-node.component';

describe('RoleTreeNodeComponent', () => {
  let component: RoleTreeNodeComponent;
  let fixture: ComponentFixture<RoleTreeNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleTreeNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoleTreeNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
