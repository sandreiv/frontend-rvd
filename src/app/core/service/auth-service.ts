import { Injectable } from '@angular/core';


interface JwtRoleObject {
  authority?: string;
  role?: string;
}

interface JwtPayload {
  idPersonaGeneral?: string | number;
  roles?: string[] | string | JwtRoleObject[];
  authorities?: string[] | JwtRoleObject[];
}


@Injectable({
  providedIn: 'root',
})
export class AuthService {

}
