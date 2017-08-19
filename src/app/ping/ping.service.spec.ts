import { async, fakeAsync, tick, TestBed, inject} from '@angular/core/testing';
import { PingService } from './ping.service';
import { StoreModule } from '@ngrx/store';
import { authenticationModelReducer } from '../state/authentication.reducer';
import { pingModelReducer } from '../state/ping.reducer';
import { HttpModule, Http, XHRBackend } from '@angular/http';
import {Response, ResponseOptions, RequestMethod} from '@angular/http';

describe('PingService', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [     
        HttpModule,
        StoreModule.provideStore({
          auth: authenticationModelReducer,
          ping: pingModelReducer
        })
      ],
      declarations: [
      ],
      providers: [
          PingService,
      ]
    }).compileComponents();
  }));

 it('should verify basic service methods', fakeAsync(
    inject([
      XHRBackend,
      PingService
    ], (mockBackend, service: PingService) => {
        service.repeating = false;
        
        expect(service.getInterval()).toBe(15000);
    })
  ));

 it('should verify more than 4 calls', fakeAsync(
    inject([
      XHRBackend,
      PingService
    ], (mockBackend, service: PingService) => {
        service.repeating = false;
        
        service.success(new Response(
            new ResponseOptions({ status: 200, body: {timestamp: new Date().getTime()} })
          ), {});
        
        service.success(new Response(
            new ResponseOptions({ status: 200, body: {timestamp: new Date().getTime()} })
          ), {});
        
        service.success(new Response(
            new ResponseOptions({ status: 200, body: {timestamp: new Date().getTime()} })
          ), {});
        
        service.success(new Response(
            new ResponseOptions({ status: 200, body: {timestamp: new Date().getTime()} })
          ), {});
        
        service.success(new Response(
            new ResponseOptions({ status: 200, body: {timestamp: new Date().getTime()} })
          ), {});
    })
  ));

});