import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AppCheckTokenResult } from '@firebase/app-check';
import { from, Observable } from 'rxjs';
import { switchMap, take } from 'rxjs/operators';
import { AuthService } from '../shared/services/auth.service';

@Injectable()
export class AppCheckInterceptor implements HttpInterceptor {
  constructor(private readonly authService: AuthService) {}

  intercept(request: HttpRequest <any>, next: HttpHandler): Observable <HttpEvent <any>> {

    return from(this.authService.getToken()).pipe(
      take(1), // See https://stackoverflow.com/a/60196923/828547.
      switchMap((token: AppCheckTokenResult | undefined) => {
        if (token) {
          request = request.clone({
            setHeaders: {
              "X-Firebase-AppCheck": token?.token
            },
          });
        }
        return next.handle(request);
      }),
    );
  }
}