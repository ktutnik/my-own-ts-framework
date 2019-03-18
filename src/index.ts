import "reflect-metadata"

import express, { NextFunction, Request, RequestHandler, Response, Router } from "express"
import { readdir } from "fs"
import { join } from "path"
import { promisify } from "util"

// ##################################################################### //
// ############################### TYPES ############################### //
// ##################################################################### //

type HttpMethod = "post" | "put" | "get" | "delete" | "patch"
type ParameterBinding = "request" | "body" | "query" | "params"

interface RouteMetadata {
    httpMethod: HttpMethod,
    route: string
}

interface BindMetadata {
    type: ParameterBinding
    index: number
}

interface RouteConfiguration {
    httpMethod: HttpMethod
    route: string
    parameterBinding: ParameterBinding[]
    controller: any
    methodName: string
}

export interface Configuration {
    controllerPath:string,
}

// ##################################################################### //
// ########################### CONFIGURATIONS ########################## //
// ##################################################################### //

const ROUTE_METADATA_KEY = "route"
const BIND_METADATA_KEY = "bind"

function decorateParameterBinding(type: ParameterBinding): ParameterDecorator {
    return (target, propName, index) => {
        const metadata: BindMetadata[] = Reflect.getMetadata(BIND_METADATA_KEY, target, propName) || []
        metadata.push({ index, type })
        Reflect.defineMetadata(BIND_METADATA_KEY, metadata, target, propName)
    }
}

function decorateRoute(httpMethod: HttpMethod, route: string): MethodDecorator {
    return Reflect.metadata(ROUTE_METADATA_KEY, <RouteMetadata>{ httpMethod, route })
}

export namespace route {
    export function get(route: string): MethodDecorator {
        return decorateRoute("get", route)
    }

    export function post(route: string): MethodDecorator {
        return decorateRoute("post", route)
    }

    export function del(route: string): MethodDecorator {
        return decorateRoute("delete", route)
    }

    export function put(route: string): MethodDecorator {
        return decorateRoute("put", route)
    }

    export function patch(route: string): MethodDecorator {
        return decorateRoute("patch", route)
    }
}

export namespace bind {
    export function request(): ParameterDecorator {
        return decorateParameterBinding("request")
    }

    export function query(): ParameterDecorator {
        return decorateParameterBinding("query")
    }

    export function body(): ParameterDecorator {
        return decorateParameterBinding("body")
    }

    export function params(): ParameterDecorator {
        return decorateParameterBinding("params")
    }
}

function getMethods(controller: any) {
    return Object.getOwnPropertyNames(controller)
        .filter(name => typeof controller[name] === "function" && name !== "constructor" && !~name.indexOf("__"))
}

function getRoute(controller: any, methodName: string): RouteConfiguration {
    const parameters: BindMetadata[] = Reflect.getMetadata(BIND_METADATA_KEY, controller.prototype, methodName) || []
    const route: RouteMetadata = Reflect.getMetadata(ROUTE_METADATA_KEY, controller.prototype, methodName)
    return {
        ...route, methodName, controller,
        parameterBinding: parameters.sort((a, b) => a.index - b.index).map(x => x.type)
    }
}

async function getRouteConfiguration(dir: string) {
    const files = await promisify(readdir)(dir)
    const routes: RouteConfiguration[] = []
    for (const file of files) {
        const theModule = require(join(dir, file))
        const controllers = Object.keys(theModule).map(x => theModule[x])
        for (const controller of controllers) {
            const methods = getMethods(controller.prototype)
            const metadata = methods.map(x => getRoute(controller, x))
            routes.push(...metadata)
        }
    }
    return routes
}

// ##################################################################### //
// ############################### BINDER ############################## //
// ##################################################################### //

const BindingLogic = {
    "request": (request:Request) => request,
    "query": (request:Request) => request.query,
    "body": (request:Request) => request.body,
    "params": (request:Request) => request.params
}

function parameterBinder(request:Request, config:RouteConfiguration){
    const {controller, parameterBinding, methodName} = config
    const params = parameterBinding.map(x => BindingLogic[x](request));
    const instance = new controller()
    return (instance[methodName] as Function).apply(controller, params)
}

function binder(config:RouteConfiguration){
    return (request:Request) => parameterBinder(request, config)
}

// ##################################################################### //
// ############################## HANDLER ############################## //
// ##################################################################### //

function createHandler(config: RouteConfiguration) {
    const binding = binder(config)
    return async (req: Request, res: Response, next:NextFunction) => {
        try{
            const result = await Promise.resolve(binding(req))
            res.json(result)
        }
        catch(e){
            next(e)
        }
    }
}

// ##################################################################### //
// ############################### ROUTER ############################## //
// ##################################################################### //

function createRouter(configurations: RouteConfiguration[]) {
    const router = Router()
    for (const config of configurations) {
        router[config.httpMethod](config.route, createHandler(config))
    }
    return router
}

// ##################################################################### //
// ########################## MAIN APPLICATION ######################### //
// ##################################################################### //

export class Application {
    readonly app = express()
    constructor(private configuration:Configuration){}

    use(...middleware:RequestHandler[]){
        return this.app.use(middleware)
    }

    async initialize(){
        const config = await getRouteConfiguration(this.configuration.controllerPath)
        const routes = createRouter(config)
        return this.app.use(routes)
    }
}