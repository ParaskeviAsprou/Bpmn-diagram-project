import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RoleTreeNode } from '../../services/role-management.service';

@Component({
  selector: 'app-role-tree-node',
  standalone: true,
  imports: [CommonModule, MatIcon, MatChipsModule],
  templateUrl: './role-tree-node.component.html',
  styleUrls: ['./role-tree-node.component.css'],
})
export class RoleTreeNodeComponent {
  @Input() node!: RoleTreeNode;

  getChipColor(): string {
    if (this.node.level === 1) return 'primary';
    if (this.node.level === 2) return 'accent';
    return 'basic';
  }
}