/* tslint:disable */
/* eslint-disable */
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import type { TsoaRoute } from '@tsoa/runtime';
import {  fetchMiddlewares, ExpressTemplateService } from '@tsoa/runtime';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { WebhookController } from './controllers/WebhookController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { HealthController } from './controllers/HealthController';
// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
import { CepController } from './controllers/CepController';
import type { Request as ExRequest, Response as ExResponse, RequestHandler, Router } from 'express';



// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

const models: TsoaRoute.Models = {
    "WebhookResponse": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
            "internalMessage": {"dataType":"string","required":true},
            "processingTimeMs": {"dataType":"double","required":true},
            "data": {"dataType":"any"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "StpPayload": {
        "dataType": "refObject",
        "properties": {
            "id": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"}],"required":true},
            "claveRastreo": {"dataType":"string","required":true},
            "fechaOperacion": {"dataType":"union","subSchemas":[{"dataType":"string"},{"dataType":"double"}],"required":true},
            "tsLiquidacion": {"dataType":"string","required":true},
            "institucionOrdenante": {"dataType":"string","required":true},
            "institucionBeneficiaria": {"dataType":"string","required":true},
            "monto": {"dataType":"double","required":true},
            "nombreOrdenante": {"dataType":"string","required":true},
            "tipoCuentaOrdenante": {"dataType":"string","required":true},
            "cuentaOrdenante": {"dataType":"string","required":true},
            "rfcCurpOrdenante": {"dataType":"string","required":true},
            "nombreBeneficiario": {"dataType":"string","required":true},
            "tipoCuentaBeneficiario": {"dataType":"string","required":true},
            "cuentaBeneficiario": {"dataType":"string","required":true},
            "nombreBeneficiario2": {"dataType":"string"},
            "tipoCuentaBeneficiario2": {"dataType":"string"},
            "cuentaBeneficiario2": {"dataType":"string"},
            "rfcCurpBeneficiario": {"dataType":"string","required":true},
            "conceptoPago": {"dataType":"string","required":true},
            "referenciaNumerica": {"dataType":"string","required":true},
            "empresa": {"dataType":"string","required":true},
            "tipoPago": {"dataType":"string","required":true},
            "folioCodi": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "PaymentResult": {
        "dataType": "refObject",
        "properties": {
            "success": {"dataType":"boolean","required":true},
            "message": {"dataType":"string","required":true},
            "internalMessage": {"dataType":"string","required":true},
            "claveRastreo": {"dataType":"string"},
            "monto": {"dataType":"double"},
            "data": {"dataType":"any"},
            "environment": {"dataType":"string"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "HealthResponse": {
        "dataType": "refObject",
        "properties": {
            "status": {"dataType":"enum","enums":["ok"],"required":true},
            "environment": {"dataType":"string","required":true},
            "timestamp": {"dataType":"string","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CepTypeStatus": {
        "dataType": "refEnum",
        "enums": ["pending","processing","completed","failed"],
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CepResponse": {
        "dataType": "refObject",
        "properties": {
            "cep_id": {"dataType":"string","required":true},
            "message": {"dataType":"string","required":true},
            "status": {"ref":"CepTypeStatus","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CepErrorResponse": {
        "dataType": "refObject",
        "properties": {
            "error": {"dataType":"string","required":true},
            "code": {"dataType":"string"},
            "status": {"ref":"CepTypeStatus"},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
    "CepStatusResponse": {
        "dataType": "refObject",
        "properties": {
            "cep_id": {"dataType":"string","required":true},
            "status": {"ref":"CepTypeStatus","required":true},
            "created_at": {"dataType":"string","required":true},
            "completed_at": {"dataType":"string"},
            "operation_date": {"dataType":"string"},
            "days_back": {"dataType":"double"},
            "records_processed": {"dataType":"double"},
            "token": {"dataType":"string"},
            "error": {"dataType":"string"},
            "download_available": {"dataType":"boolean","required":true},
        },
        "additionalProperties": false,
    },
    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
};
const templateService = new ExpressTemplateService(models, {"noImplicitAdditionalProperties":"throw-on-extras","bodyCoercion":true});

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa




export function RegisterRoutes(app: Router) {

    // ###########################################################################################################
    //  NOTE: If you do not see routes for all of your controllers in this file, then you might not have informed tsoa of where to look
    //      Please look into the "controllerPathGlobs" config option described in the readme: https://github.com/lukeautry/tsoa
    // ###########################################################################################################


    
        const argsWebhookController_processDzogPayment: Record<string, TsoaRoute.ParameterSchema> = {
                payload: {"in":"body","name":"payload","required":true,"ref":"StpPayload"},
        };
        app.post('/webhook/dzog-capital/payments',
            ...(fetchMiddlewares<RequestHandler>(WebhookController)),
            ...(fetchMiddlewares<RequestHandler>(WebhookController.prototype.processDzogPayment)),

            async function WebhookController_processDzogPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWebhookController_processDzogPayment, request, response });

                const controller = new WebhookController();

              await templateService.apiHandler({
                methodName: 'processDzogPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsWebhookController_processStpPayment: Record<string, TsoaRoute.ParameterSchema> = {
                payload: {"in":"body","name":"payload","required":true,"ref":"StpPayload"},
        };
        app.post('/webhook/aplicarPago',
            ...(fetchMiddlewares<RequestHandler>(WebhookController)),
            ...(fetchMiddlewares<RequestHandler>(WebhookController.prototype.processStpPayment)),

            async function WebhookController_processStpPayment(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsWebhookController_processStpPayment, request, response });

                const controller = new WebhookController();

              await templateService.apiHandler({
                methodName: 'processStpPayment',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 200,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsHealthController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/health',
            ...(fetchMiddlewares<RequestHandler>(HealthController)),
            ...(fetchMiddlewares<RequestHandler>(HealthController.prototype.getHealth)),

            async function HealthController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsHealthController_getHealth, request, response });

                const controller = new HealthController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCepController_getHealth: Record<string, TsoaRoute.ParameterSchema> = {
        };
        app.get('/api/v1/ceps/health',
            ...(fetchMiddlewares<RequestHandler>(CepController)),
            ...(fetchMiddlewares<RequestHandler>(CepController.prototype.getHealth)),

            async function CepController_getHealth(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCepController_getHealth, request, response });

                const controller = new CepController();

              await templateService.apiHandler({
                methodName: 'getHealth',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCepController_generateFromYesterday: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"any"},
        };
        app.post('/api/v1/ceps/generate',
            ...(fetchMiddlewares<RequestHandler>(CepController)),
            ...(fetchMiddlewares<RequestHandler>(CepController.prototype.generateFromYesterday)),

            async function CepController_generateFromYesterday(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCepController_generateFromYesterday, request, response });

                const controller = new CepController();

              await templateService.apiHandler({
                methodName: 'generateFromYesterday',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 202,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCepController_generateFromSpecificDate: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"any"},
        };
        app.post('/api/v1/ceps/generate-date',
            ...(fetchMiddlewares<RequestHandler>(CepController)),
            ...(fetchMiddlewares<RequestHandler>(CepController.prototype.generateFromSpecificDate)),

            async function CepController_generateFromSpecificDate(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCepController_generateFromSpecificDate, request, response });

                const controller = new CepController();

              await templateService.apiHandler({
                methodName: 'generateFromSpecificDate',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 202,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCepController_generateMissing: Record<string, TsoaRoute.ParameterSchema> = {
                body: {"in":"body","name":"body","required":true,"dataType":"any"},
        };
        app.post('/api/v1/ceps/generate-missing',
            ...(fetchMiddlewares<RequestHandler>(CepController)),
            ...(fetchMiddlewares<RequestHandler>(CepController.prototype.generateMissing)),

            async function CepController_generateMissing(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCepController_generateMissing, request, response });

                const controller = new CepController();

              await templateService.apiHandler({
                methodName: 'generateMissing',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: 202,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
        const argsCepController_getCepStatus: Record<string, TsoaRoute.ParameterSchema> = {
                cepId: {"in":"path","name":"cepId","required":true,"dataType":"string"},
        };
        app.get('/api/v1/ceps/status/:cepId',
            ...(fetchMiddlewares<RequestHandler>(CepController)),
            ...(fetchMiddlewares<RequestHandler>(CepController.prototype.getCepStatus)),

            async function CepController_getCepStatus(request: ExRequest, response: ExResponse, next: any) {

            // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

            let validatedArgs: any[] = [];
            try {
                validatedArgs = templateService.getValidatedArgs({ args: argsCepController_getCepStatus, request, response });

                const controller = new CepController();

              await templateService.apiHandler({
                methodName: 'getCepStatus',
                controller,
                response,
                next,
                validatedArgs,
                successStatus: undefined,
              });
            } catch (err) {
                return next(err);
            }
        });
        // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa

    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa


    // WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
}

// WARNING: This file was auto-generated with tsoa. Please do not modify it. Re-run tsoa to re-generate this file: https://github.com/lukeautry/tsoa
