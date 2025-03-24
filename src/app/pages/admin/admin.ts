import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms'; // Import FormsModule
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ButtonModule, FormsModule, TableModule],
  template: `<div>admin page</div>`
})
export class Admin {
}
