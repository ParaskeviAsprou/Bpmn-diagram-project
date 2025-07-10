import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RoleTreeNode } from '../../services/role-management.service';

@Component({
  selector: 'app-role-tree-node',
  standalone: true,
  imports: [CommonModule, MatIcon, MatChipsModule],
  template: `
    <div class="tree-node-container">
      <div class="node-content" [style.margin-left.px]="node.level * 20">
        <mat-icon class="tree-icon">
          {{ node.children.length > 0 ? 'account_tree' : 'person' }}
        </mat-icon>
        <mat-chip [color]="getChipColor()">
          {{ node.role.displayName }}
        </mat-chip>
        <span class="role-name">({{ node.role.name }})</span>
        <span class="level-badge">Level {{ node.level }}</span>
      </div>
      
      <div class="children" *ngIf="node.children.length > 0">
        <app-role-tree-node 
          *ngFor="let child of node.children" 
          [node]="child">
        </app-role-tree-node>
      </div>
    </div>
  `,
  styles: [`
    .tree-node-container {
      margin: 4px 0;
    }
    
    .node-content {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-left: 2px solid #e0e0e0;
      background-color: #fafafa;
      border-radius: 4px;
    }
    
    .tree-icon {
      color: #666;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .role-name {
      color: #666;
      font-size: 12px;
    }
    
    .level-badge {
      background-color: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    
    .children {
      border-left: 1px dashed #ccc;
      margin-left: 10px;
    }
  `]
})
export class RoleTreeNodeComponent {
  @Input() node!: RoleTreeNode;

  getChipColor(): string {
    if (this.node.level === 1) return 'primary';
    if (this.node.level === 2) return 'accent';
    return 'basic';
  }
}