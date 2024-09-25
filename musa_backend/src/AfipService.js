const path = require('path');
const fs = require('fs');
const { Wsaa, Wsfe, Wspci } = require('afipjs');

class AfipService {

    constructor({ CUIT }) {

        this.CUIT = CUIT;

        this.conf = {
            prod: true,
            debug: false,
        };

        this.pem = fs.readFileSync(path.join(__dirname, 'cert', 'musaprodcert.crt'), 'utf8');
        this.key = fs.readFileSync(path.join(__dirname, 'cert', 'musaprodkey.key'), 'utf8');

        this.wsfe = null;
        this.wspci = null;

        this.pago_efectivo = 172244;
        this.pago_electronico = 344488;

        this.ptoVta = 21;
    }

    async initWsfe() {
        if (!this.wsfe) {
            const wsaaFe = new Wsaa(this.conf);
            wsaaFe.setCertificate(this.pem);
            wsaaFe.setKey(this.key);
            const ta = await this.getValidTA(wsaaFe, "wsfe");
            this.wsfe = new Wsfe(ta, this.conf);
        }
    }

    async initWspci() {
        if (!this.wspci) {
            const wsaaPci = new Wsaa({
                ...this.conf,
                service: "ws_sr_constancia_inscripcion",
            });
            wsaaPci.setCertificate(this.pem);
            wsaaPci.setKey(this.key);
            const ta = await this.getValidTA(wsaaPci, "ws_sr_constancia_inscripcion");
            this.wspci = new Wspci(ta, this.conf);
        }
    }

    async getValidTA(wsaa, service) {
        let ta;
        const taFile = path.join(__dirname, `${service}_ta.xml`);
        try {
            ta = wsaa.createTAFromString(fs.readFileSync(taFile, 'utf8'));
            if (!ta.isValid()) throw new Error("TA inválido");
        } catch {
            const tra = wsaa.createTRA(service);
            ta = await tra.supplicateTA();
            fs.writeFileSync(taFile, ta.TA);
        }
        return ta;
    }

    async getTiposIva() {
        await this.initWsfe();
        const response = await this.wsfe.FEParamGetTiposIva({});
        console.dir(response, { depth: null });
    }

    async getPersona(cuit) {
        await this.initWspci();
        const response = await this.wspci.getPersona_v2({
            cuitRepresentada: this.CUIT,
            idPersona: cuit
        });
        return response;
    }

    async ultimoAutorizado(PtoVta, CbteTipo) {
        await this.initWsfe();
        const response = await this.wsfe.FECompUltimoAutorizado({ PtoVta, CbteTipo });
        return response.FECompUltimoAutorizadoResult.CbteNro;
    }

    async facturaA(monto, cuit) {
        const CbteTipo = 1;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        const factura = this.buildFactura(CbteTipo, cuit, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva);
        const response = await this.wsfe.FECAESolicitar(factura);
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo: 80,
        }
    }

    async facturaB(monto, docNro) {
        const CbteTipo = 6;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        const docTipo = docNro !== 0 ? 96 : 99;
        const factura = this.buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo);
        const response = await this.wsfe.FECAESolicitar(factura);
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo,
        }
    }

    async notaCreditoA(monto, cuit, facturaNumero) {
        const CbteTipo = 3;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        const factura = this.buildFactura(CbteTipo, cuit, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, 80, {
            Tipo: 1,
            PtoVta: this.ptoVta,
            Nro: facturaNumero,
        });
        const response = await this.wsfe.FECAESolicitar(factura);
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo: 80,
        }
    }

    async notaCreditoB(monto, docNro, facturaNumero) {
        const CbteTipo = 8;
        const ultimoAutorizado = await this.ultimoAutorizado(this.ptoVta, CbteTipo);
        const fecha = this.getCurrentDate();
        const { importe_total, importe_gravado, importe_iva } = this.calculateImportes(monto);
        docNro = docNro ?? 0;
        const docTipo = docNro !== 0 ? 96 : 99;
        const factura = this.buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo, {
            Tipo: 6,
            PtoVta: this.ptoVta,
            Nro: facturaNumero,
        });
        const response = await this.wsfe.FECAESolicitar(factura);
        console.dir(response, { depth: null });
        return {
            CAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAE,
            vtoCAE: response.FECAESolicitarResult.FeDetResp.FECAEDetResponse[0].CAEFchVto,
            numeroComprobante: ultimoAutorizado + 1,
            docTipo,
        }
    }

    getCurrentDate() {
        return new Date(Date.now() - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }

    calculateImportes(monto) {
        const importe_total = parseFloat(monto).toFixed(2);
        const importe_gravado = (importe_total / 1.21).toFixed(2);
        const importe_iva = (importe_total - importe_gravado).toFixed(2);
        return { importe_total, importe_gravado, importe_iva };
    }

    buildFactura(CbteTipo, docNro, ultimoAutorizado, fecha, importe_total, importe_gravado, importe_iva, docTipo = 80, cbteAsoc = null) {
        const factura = {
            FeCAEReq: {
                FeCabReq: {
                    CantReg: 1,
                    PtoVta: this.ptoVta,
                    CbteTipo,
                },
                FeDetReq: {
                    FECAEDetRequest: {
                        Concepto: 1,
                        DocTipo: docTipo,
                        DocNro: docNro,
                        CbteDesde: ultimoAutorizado + 1,
                        CbteHasta: ultimoAutorizado + 1,
                        CbteFch: parseInt(fecha.replace(/-/g, '')),
                        ImpTotal: importe_total,
                        ImpTotConc: 0.00,
                        ImpNeto: importe_gravado,
                        ImpOpEx: 0.00,
                        ImpTrib: 0.00,
                        ImpIVA: importe_iva,
                        MonId: "PES",
                        MonCotiz: 1,
                        Iva: {
                            AlicIva: [
                                {
                                    Id: 5,
                                    BaseImp: importe_gravado,
                                    Importe: importe_iva,
                                },
                            ],
                        },
                        ...(cbteAsoc && {
                            CbtesAsoc: {
                                CbteAsoc: [cbteAsoc]
                            }
                        }),
                    }
                }
            }
        };
        return factura;
    }
}

module.exports = AfipService;
