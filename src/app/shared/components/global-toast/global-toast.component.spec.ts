import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalToastComponent } from './global-toast.component';

describe('GlobalToastComponent', () => {
  let component: GlobalToastComponent;
  let fixture: ComponentFixture<GlobalToastComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GlobalToastComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
