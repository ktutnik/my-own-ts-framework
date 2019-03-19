# My Own TypeScript Framework

[![Build Status](https://travis-ci.org/ktutnik/my-own-ts-framework.svg?branch=master)](https://travis-ci.org/ktutnik/my-own-ts-framework)
[![Coverage Status](https://coveralls.io/repos/github/ktutnik/my-own-ts-framework/badge.svg?branch=master)](https://coveralls.io/github/ktutnik/my-own-ts-framework?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/ktutnik/my-own-ts-framework.svg)](https://greenkeeper.io/)

This project is an example on how to create a simple Rest API framework.

## Decorator Route
Route url into method controller using decorator

```typescript
export class AnimalController {

    @route.get("/animals/:id")
    get() {
        //handle GET /animals/:id request
    }

    @route.post("/animals")
    save() {
        //handle POST /animals request
    }
}
```

## Decorator Parameter Binding
Bind request or request part into method parameter using decorator

```typescript
export class AnimalController {

    @route.get("/animals/:id")
    get(@bind.params() data: any) {
        //data bound into req.params
    }

    @route.post("/animals")
    save(@bind.body() data: any) {
        //data bound into req.body
    }
}
```

## Optional Dependency Injection 
Dependency resolver is controller factory who creates instance of controller. It must resolve controller dependency automatically. 

Usually you use dependency injection / IOC Container controller such as [Inversify](inversify.io) or [Your Own IoC Container](https://github.com/ktutnik/my-own-ioc-container)

```typescript 
class MyCustomDependencyResolver implements DependencyResolver {
    //container is any IoC container
    constructor(private container:Container){}

    resolve(controller: any) {
        return this.container.resolve(controller)
    }
}


const app = new Application({ 
    controllerPath: join(__dirname, "controller"),
    resolver: new MyCustomDependencyResolver()
})
```
