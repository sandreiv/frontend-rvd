import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DraftContract } from './draft-contract';

import { HiringCallService } from '../../data/hiring-call.service';

class HiringCallServiceStub {
  vincularDocenteCalls: Array<{ idCargaDocente: number; numeroPeriodo: string; labor: string | null }> = [];
  downloadContractPdfCalls: Array<{ idCargaDocente: number; numeroPeriodo: string }> = [];

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

  vincularDocente(idCargaDocente: number, numeroPeriodo: string, labor: string | null) {
    this.vincularDocenteCalls.push({ idCargaDocente, numeroPeriodo, labor });
    return of({ idContrato: 55, idCargaDocente });
  }

  downloadContractPdf(idCargaDocente: number, numeroPeriodo: string) {
    this.downloadContractPdfCalls.push({ idCargaDocente, numeroPeriodo });
    return of({ blob: new Blob([]), fileName: 'anexo.pdf' });
  }
}

describe('DraftContract', () => {
  let component: DraftContract;
  let fixture: ComponentFixture<DraftContract>;

  let serviceStub: HiringCallServiceStub;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DraftContract],
      providers: [{ provide: HiringCallService, useClass: HiringCallServiceStub }],
    }).compileComponents();

    serviceStub = TestBed.inject(HiringCallService) as unknown as HiringCallServiceStub;

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


  it('debe vincular al docente sin generar ni descargar el PDF', async () => {
    await abrirPanel('VINCULAR');

    component.contractForm.controls.laborId.setValue('7');
    component.contractForm.controls.laborId.updateValueAndValidity();

    component.submitContract();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(serviceStub.vincularDocenteCalls.length).toBe(1);
    expect(serviceStub.vincularDocenteCalls[0].idCargaDocente).toBe(523);
    expect(serviceStub.vincularDocenteCalls[0].labor).toBe('7');

    // La vinculacion no debe pedir el PDF: ese paso es el de generacion.
    expect(serviceStub.downloadContractPdfCalls.length).toBe(0);
  });

  it('debe generar y descargar el PDF al generar el contrato', async () => {
    await abrirPanel('GENERAR');

    component.submitContract();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(serviceStub.downloadContractPdfCalls.length).toBe(1);
    expect(serviceStub.downloadContractPdfCalls[0].idCargaDocente).toBe(523);

    // Generar el contrato no vincula al docente.
    expect(serviceStub.vincularDocenteCalls.length).toBe(0);
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
