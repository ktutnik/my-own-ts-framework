import "reflect-metadata"

import express, { NextFunction, Request, RequestHandler, Response, Router } from "express"
import { readdir } from "fs"
import { join } from "path"
import { promisify } from "util"

// ##################################################################### //
// ############################### TYPES ############################### //
// ##################################################################### //

type HttpMethod = "post" | "put" | "get" | "delete" | "patch"
type BindingCallback = (req: Request) => any

interface RouteMetadata {
    httpMethod: HttpMethod,
    route: string
}

interface BindMetadata {
    index: number
    bindingCallback: BindingCallback
}

interface DependencyResolver {
    resolve(controller: any): any
}

interface RouteConfiguration {
    resolver: DependencyResolver
    httpMethod: HttpMethod
    route: string
    bindingCallbacks: BindingCallback[]
    controller: any
    methodName: string
}

export interface Configuration {
    controllerPath: string,
    resolver?: DependencyResolver
}

// ##################################################################### //
// ########################### CONFIGURATIONS ########################## //
// ##################################################################### //

const ROUTE_METADATA_KEY = "route"
const BIND_METADATA_KEY = "bind"

function decorateParameterBinding(bindingCallback: BindingCallback): ParameterDecorator {
    return (target, propName, index) => {
        const metadata: BindMetadata[] = Reflect.getMetadata(BIND_METADATA_KEY, target, propName) || []
        metadata.push({ index, bindingCallback })
        Reflect.defineMetadata(BIND_METADATA_KEY, metadata, target, propName)
    }
}

function decorateRoute(httpMethod: HttpMethod, route: string): MethodDecorator {
    return Reflect.metadata(ROUTE_METADATA_KEY, <RouteMetadata>{ httpMethod, route })
}

export namespace route {
    export const get = (route: string) => decorateRoute("get", route)
    export const post = (route: string) => decorateRoute("post", route)
    export const del = (route: string) => decorateRoute("delete", route)
    export const put = (route: string) => decorateRoute("put", route)
    export const patch = (route: string) => decorateRoute("patch", route)
}

export namespace bind {
    export const custom = (callback: BindingCallback) => decorateParameterBinding(callback)
    export const request = () => custom(x => x)
    export const query = () => custom(x => x.query)
    export const body = () => custom(x => x.body)
    export const params = () => custom(x => x.params)
}

function getMethods(controller: any) {
    return Object.getOwnPropertyNames(controller)
        .filter(name => typeof controller[name] === "function" && name !== "constructor" && !~name.indexOf("__"))
}

function getRoute(controller: any, methodName: string, resolver: DependencyResolver): RouteConfiguration {
    const parameters: BindMetadata[] = Reflect.getMetadata(BIND_METADATA_KEY, controller.prototype, methodName) || []
    const route: RouteMetadata = Reflect.getMetadata(ROUTE_METADATA_KEY, controller.prototype, methodName)
    return {
        ...route, methodName, controller, resolver,
        bindingCallbacks: parameters.sort((a, b) => a.index - b.index).map(x => x.bindingCallback)
    }
}

async function getRouteConfiguration(config: Required<Configuration>) {
    const files = await promisify(readdir)(config.controllerPath)
    const routes: RouteConfiguration[] = []
    for (const file of files) {
        const theModule = require(join(config.controllerPath, file))
        const controllers = Object.keys(theModule).map(x => theModule[x])
        for (const controller of controllers) {
            const methods = getMethods(controller.prototype)
            const metadata = methods.map(x => getRoute(controller, x, config.resolver))
            routes.push(...metadata)
        }
    }
    return routes
}

// ##################################################################### //
// ############################### BINDER ############################## //
// ##################################################################### //

function parameterBinder(request: Request, config: RouteConfiguration) {
    const { controller, bindingCallbacks: parameterBinding, methodName, resolver } = config
    const params = parameterBinding.map(bindingCallback => bindingCallback(request));
    const instance = resolver.resolve(controller)
    return (instance[methodName] as Function).apply(controller, params)
}

function binder(config: RouteConfiguration) {
    return (request: Request) => parameterBinder(request, config)
}

// ##################################################################### //
// ############################## HANDLER ############################## //
// ##################################################################### //

function createHandler(config: RouteConfiguration) {
    const binding = binder(config)
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await Promise.resolve(binding(req))
            res.json(result)
        }
        catch (e) {
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

class DefaultDependencyResolver implements DependencyResolver {
    resolve(controller: any) {
        return new controller()
    }
}

export class Application {
    readonly app = express()
    constructor(private configuration: Configuration) { }

    use(...middleware: RequestHandler[]) {
        return this.app.use(middleware)
    }

    async initialize() {
        const { resolver, ...appConfigs } = this.configuration
        const routeConfigs = await getRouteConfiguration({ ...appConfigs, resolver: resolver || new DefaultDependencyResolver() })
        const routes = createRouter(routeConfigs)
        return this.app.use(routes)
    }
}