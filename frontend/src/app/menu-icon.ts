import { Component, Input } from '@angular/core';

const icons: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M12 4v.01M12 12v.01M12 20v.01',
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h3',
  package: 'm3 7 9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M8 5l9 4',
  add: 'M4 5h10v14H4zM7 9h4M7 13h4M18 7v8M14 11h8',
  sale: 'M3 6h18v14H3zM7 6V3h10v3M8 11h8M12 9v8M8 15h8',
  products: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  cart: 'M2 3h3l3 12h10l3-9H6M9 20v.01M18 20v.01',
  up: 'M12 20V4M5 11l7-7 7 7',
  down: 'M12 4v16M5 13l7 7 7-7',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  users: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M1 21v-3a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v3M16 3a4 4 0 0 1 0 8M18 13a5 5 0 0 1 5 5v3',
  logout: 'M10 3H4v18h6M9 12h12M17 8l4 4-4 4',
};
@Component({selector:'app-menu-icon',standalone:true,template:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" [attr.stroke-width]="name==='more'?4:1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path [attr.d]="path" /></svg>`,styles:[`:host{display:inline-flex;width:22px;height:22px;flex:none}svg{width:100%;height:100%}`]})
export class MenuIcon { @Input() name='menu'; get path(){return icons[this.name]??icons['menu'];} }
