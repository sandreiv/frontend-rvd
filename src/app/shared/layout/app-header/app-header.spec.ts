import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { APP_CONFIG } from '../../../core/config/app-config.token';
import { environment } from '../../../../environments/environment';
import { AppHeader } from './app-header';

describe('AppHeader', () => {
  let component: AppHeader;
  let fixture: ComponentFixture<AppHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppHeader],
      providers: [
        provideRouter([]),
        { provide: APP_CONFIG, useValue: environment },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
