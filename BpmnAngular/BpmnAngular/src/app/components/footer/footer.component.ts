import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-left">
          <p>&copy; 2024 BPMN Manager. All rights reserved.</p>
        </div>
        <div class="footer-center">
          <nav class="footer-nav">
            <a href="#" class="footer-link">Documentation</a>
            <a href="#" class="footer-link">Support</a>
            <a href="#" class="footer-link">Privacy Policy</a>
            <a href="#" class="footer-link">Terms of Service</a>
          </nav>
        </div>
        <div class="footer-right">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: white;
      border-top: 1px solid #e0e0e0;
      padding: 15px 20px;
      margin-top: auto;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1200px;
      margin: 0 auto;
    }

    .footer-left p,
    .footer-right p {
      margin: 0;
      color: #666;
      font-size: 12px;
    }

    .footer-nav {
      display: flex;
      gap: 20px;
    }

    .footer-link {
      color: #666;
      text-decoration: none;
      font-size: 12px;
      transition: color 0.3s ease;
    }

    .footer-link:hover {
      color: #2196f3;
    }

    @media (max-width: 768px) {
      .footer-content {
        flex-direction: column;
        gap: 10px;
        text-align: center;
      }

      .footer-nav {
        flex-wrap: wrap;
        justify-content: center;
        gap: 15px;
      }
    }
  `]
})
export class FooterComponent {}