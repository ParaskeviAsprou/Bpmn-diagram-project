import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';


interface Role {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
}

interface RoleTreeNode {
  role: Role;
  level: number;
  children: RoleTreeNode[];
}

@Component({
  selector: 'app-role-tree-node',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatChipsModule],
  templateUrl: './role-tree-node.component.html',
  styleUrls: ['./role-tree-node.component.css']
})
export class RoleTreeNodeComponent {
  @Input() node!: RoleTreeNode;

  getChipColor(): string {
    if (this.node.level === 1) return 'primary';
    if (this.node.level === 2) return 'accent';
    return 'basic';
  }
}