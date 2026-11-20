import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DraftContract } from './draft-contract';

import { HiringCallService } from '../../data/hiring-call.service';

class HiringCallServiceStub {
  getContractCatalogs() {
    return of({ formasPago: [], tiposObjeto: [], formasInicioContrato: [], labores: [] });
  }

  getContractAnexo() {
    return of({
      idCargaDocente: 523,
      numeroAnexo: '13',
      fechaFirma: '2026-11-18',
      idFormaPago: 3,
      idTipoObjeto: 5,
      idFormaInicioContrato: 1,
      objeto: 'OBJETO DE PRUEBA',
      descripcion: 'DESCRIPCION DE PRUEBA',
    });
  }

  getProfessorInformation() {
    return of({
      idPersonaGeneral: 99,
      nombreCompleto: 'Docente Prueba',
      documentoIdentidad: '123',
      direccionDomicilio: 'Calle 1',
      correoPersonal: 'a@b.com',
      correoInstitucional: 'c@d.com',
      modalidadContratacion: 'DOCENTE',
      fechaInicio: '2026-02-01',
      fechaFin: '2026-12-31',
      formaPago: 'PRUEBA',
      estadoCategoratizacion: 'A',
      asignacionSalarial: 1000,
      horas: '40',
      categoriaDocente: 'DOCENTE',
      puntos: 10,
      valorHora: 25,
      contratacionVinculado: null,
      contratacionSincronizado: null,
      numeroContrato: '13',
      horasActividades: [],
    });
  }

  getInfoPtdWithWeights() {
    return of({ observacion: { descripcion: '' } });
  }

  getHiringCdpInformation() {
    return of({});
  }

  getHiringValuesInformation() {
    return of({});
  }
}

describe('DraftContract', () => {
  let component: DraftContract;
  let fixture: ComponentFixture<DraftContract>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DraftContract],
      providers: [{ provide: HiringCallService, useClass: HiringCallServiceStub }],
    }).compileComponents();

    fixture = TestBed.createComponent(DraftContract);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('idCargaDocente', 523);
    fixture.componentRef.setInput('idPeriodoUniversitario', 1);
    fixture.componentRef.setInput('idCoordinacion', 1);
    fixture.componentRef.setInput('numeroPeriodo', '2026-1');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  async function abrirPanel(operation: 'GENERAR' | 'VINCULAR'): Promise<void> {
    component.toggleContractPanel(operation);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('debe recuperar los datos ya diligenciados del anexo al generar', async () => {
    await abrirPanel('GENERAR');

    const controls = component.contractForm.controls;

    expect(controls.objeto.value).toBe('OBJETO DE PRUEBA');
    expect(controls.descripcion.value).toBe('DESCRIPCION DE PRUEBA');
    expect(controls.fechaFirma.value).toBe('2026-11-18');
    expect(controls.formaPagoId.value).toBe('3');
    expect(controls.tipoObjetoId.value).toBe('5');
    expect(controls.formaInicioContratoId.value).toBe('1');
  });

  it('debe dejar modificables los datos del anexo al generar el contrato', async () => {
    await abrirPanel('GENERAR');

    const controls = component.contractForm.controls;

    expect(controls.objeto.disabled).toBe(false);
    expect(controls.descripcion.disabled).toBe(false);
    expect(controls.fechaFirma.disabled).toBe(false);
    expect(controls.formaPagoId.disabled).toBe(false);
    expect(controls.tipoObjetoId.disabled).toBe(false);
    expect(controls.formaInicioContratoId.disabled).toBe(false);
  });

  it('debe bloquear los datos del anexo y dejar solo la labor docente editable al vincular', async () => {
    await abrirPanel('VINCULAR');

    const controls = component.contractForm.controls;

    expect(controls.objeto.disabled).toBe(true);
    expect(controls.descripcion.disabled).toBe(true);
    expect(controls.fechaFirma.disabled).toBe(true);
    expect(controls.formaPagoId.disabled).toBe(true);
    expect(controls.tipoObjetoId.disabled).toBe(true);
    expect(controls.formaInicioContratoId.disabled).toBe(true);
    expect(controls.laborId.disabled).toBe(false);
  });

  it('debe mostrar los datos ya diligenciados al vincular el docente', async () => {
    await abrirPanel('VINCULAR');

    const controls = component.contractForm.controls;

    expect(controls.objeto.value).toBe('OBJETO DE PRUEBA');
    expect(controls.descripcion.value).toBe('DESCRIPCION DE PRUEBA');
    expect(controls.fechaFirma.value).toBe('2026-11-18');
  });

  it('debe pintar el objeto y la descripcion en los inputs al vincular el docente', async () => {
    await abrirPanel('VINCULAR');

    const objetoInput: HTMLInputElement =
      fixture.nativeElement.querySelector('[formcontrolname="objeto"] input');
    const descripcionInput: HTMLInputElement =
      fixture.nativeElement.querySelector('[formcontrolname="descripcion"] input');

    expect(objetoInput.value).toBe('OBJETO DE PRUEBA');
    expect(descripcionInput.value).toBe('DESCRIPCION DE PRUEBA');
  });

  it('debe pintar el objeto y la descripcion en los inputs al generar el contrato', async () => {
    await abrirPanel('GENERAR');

    const objetoInput: HTMLInputElement =
      fixture.nativeElement.querySelector('[formcontrolname="objeto"] input');
    const descripcionInput: HTMLInputElement =
      fixture.nativeElement.querySelector('[formcontrolname="descripcion"] input');

    expect(objetoInput.value).toBe('OBJETO DE PRUEBA');
    expect(descripcionInput.value).toBe('DESCRIPCION DE PRUEBA');
  });
});
