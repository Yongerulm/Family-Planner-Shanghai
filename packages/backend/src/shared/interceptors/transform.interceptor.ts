import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types/common.types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        // Wenn data bereits das ApiResponse-Format hat, nicht doppelt wrappen
        if (data !== null && typeof data === 'object' && 'data' in (data as object)) {
          return data as unknown as ApiResponse<T>;
        }
        return { data };
      }),
    );
  }
}
