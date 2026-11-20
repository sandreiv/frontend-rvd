import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_CONFIG } from '../../../../core/config/app-config.token';
import { environment } from '../../../../../environments/environment';
import { Breadcrumb } from './breadcrumb';

describe('Breadcrumb', () => {
  let component: Breadcrumb;
  let fixture: ComponentFixture<Breadcrumb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Breadcrumb],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: environment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Breadcrumb);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
