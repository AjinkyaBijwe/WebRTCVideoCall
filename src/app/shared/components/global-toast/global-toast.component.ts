import { Component, OnInit } from '@angular/core';
import { SharedService } from '../../services/shared.service';

@Component({
  selector: 'app-global-toast',
  templateUrl: './global-toast.component.html',
  styleUrls: ['./global-toast.component.scss'],
  host: {'class': 'toast-container position-fixed top-0 end-0 p-4', 'style': 'z-index: 9999' }
})
export class GlobalToastComponent implements OnInit {

  constructor(public sharedService: SharedService) { }

  ngOnInit(): void {
  }

}
